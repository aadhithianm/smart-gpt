import os
import sys
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from graphify.llm import extract_files_direct

def main():
    # 1. Read uncached files
    uncached_path = Path("graphify-out/.graphify_uncached.txt")
    if not uncached_path.exists():
        print("No uncached files list found.")
        sys.exit(0)

    uncached_files = [Path(line.strip()) for line in uncached_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not uncached_files:
        print("No uncached files.")
        sys.exit(0)

    # Set API key and model in environment dynamically
    if "GEMINI_API_KEY" not in os.environ:
        dotenv_path = Path(__file__).parent.parent / "backend" / ".env"
        if dotenv_path.exists():
            for line in dotenv_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()
                    break

    if "GRAPHIFY_GEMINI_MODEL" not in os.environ:
        os.environ["GRAPHIFY_GEMINI_MODEL"] = "gemini-3.5-flash"

    # Group files:
    # Images get their own chunk. Non-images get grouped in chunks of 25.
    image_exts = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
    images = [f for f in uncached_files if f.suffix.lower() in image_exts]
    non_images = [f for f in uncached_files if f.suffix.lower() not in image_exts]

    chunks = []
    # Non-images in chunks of 25
    for i in range(0, len(non_images), 25):
        chunks.append(non_images[i:i+25])
    # Images in individual chunks
    for img in images:
        chunks.append([img])

    print(f"Total chunks: {len(chunks)} ({len(non_images)} non-images in {len(chunks)-len(images)} chunks, {len(images)} images)")

    # We run extraction in parallel using ThreadPoolExecutor
    def run_chunk(idx, chunk):
        t0 = time.time()
        try:
            # extract_files_direct handles calling the LLM and parsing the JSON response.
            res = extract_files_direct(chunk, backend="gemini")
            # Save to graphify-out/.graphify_chunk_NN.json
            chunk_file = Path(f"graphify-out/.graphify_chunk_{idx:02d}.json")
            chunk_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"Chunk {idx:02d} completed in {time.time()-t0:.2f}s: {len(res.get('nodes', []))} nodes, {len(res.get('edges', []))} edges")
            return idx, True
        except Exception as e:
            print(f"Chunk {idx:02d} failed: {e}")
            return idx, False

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(run_chunk, idx, chunk) for idx, chunk in enumerate(chunks)]
        for f in as_completed(futures):
            f.result()

    print("All semantic extraction chunks finished.")

if __name__ == '__main__':
    main()
