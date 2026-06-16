import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from typing import Dict, Any
from app.db.database import async_session_local
from app.db.models import User, Workspace
from sqlalchemy.future import select
from uuid import UUID

security_bearer = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> Dict[str, Any]:
    """
    Decodes and validates the Supabase Auth JWT token from the Authorization header.
    Supports both legacy symmetric (HS256) and modern asymmetric (ES256/RS256) algorithms.
    """
    token = credentials.credentials
    try:
        # 1. Parse algorithm from unverified header
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        
        # 2. Decode based on algorithm type
        if alg == "HS256":
            # Symmetric signing using project JWT secret
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        else:
            # Asymmetric signing (RS256, ES256) using Supabase JWKS endpoint
            from jwt import PyJWKClient
            # Ensure url is formatted correctly
            supabase_url = settings.SUPABASE_URL.rstrip('/')
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            
            jwks_client = PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated"
            )

        user_id = payload.get("sub")
        email = payload.get("email")

        # Lazy sync user if missing in public.users (e.g. after schema reset)
        async with async_session_local() as db:
            user_exists = (await db.execute(
                select(User).where(User.id == UUID(user_id))
            )).scalar_one_or_none()
            
            if not user_exists:
                metadata = payload.get("user_metadata", {}) or {}
                new_user = User(
                    id=UUID(user_id),
                    email=email,
                    full_name=metadata.get("full_name"),
                    avatar_url=metadata.get("avatar_url")
                )
                db.add(new_user)
                
                # Create default workspace (database trigger automatically handles workspace membership)
                personal_ws = Workspace(
                    name="Personal Workspace",
                    created_by=UUID(user_id)
                )
                db.add(personal_ws)
                await db.commit()

        return {
            "id": user_id,
            "email": email,
            "role": payload.get("role")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        # Log error to console for easy developer diagnostics
        print(f"JWT Verification Failed: {str(e)} | Alg: {header.get('alg')} | Secret Len: {len(settings.SUPABASE_JWT_SECRET)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
