$py = Get-Content graphify-out\.graphify_python -Raw
& $py graphify-out\semantic_extract.py
