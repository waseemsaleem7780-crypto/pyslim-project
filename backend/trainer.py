"""
PySlim AI - Self-Training Script
Raat ko 3 baje chalao: python trainer.py
Yeh script:
1. Positive feedback wala data uthata hai
2. Training format mein save karta hai
3. (Future) LoRA fine-tuning chalayegi
"""
import json
import os
from datetime import datetime
from feedback_db import get_good_examples, get_stats

def main():
    print("=" * 60)
    print("PySlim Self-Training Pipeline")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Step 1: Stats dekho
    stats = get_stats()
    print(f"\n📊 Feedback Stats:")
    print(f"   👍 Positive: {stats['positive']}")
    print(f"   👎 Negative: {stats['negative']}")
    
    # Step 2: Good examples fetch karo
    examples = get_good_examples(limit=500)
    print(f"\n📥 Fetched {len(examples)} good examples")
    
    if len(examples) < 50:
        print("⚠️  Not enough data yet. Need at least 50 good examples to train.")
        return
    
    # Step 3: Training format mein save karo (JSONL)
    os.makedirs("training_data", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"training_data/train_{timestamp}.jsonl"
    
    with open(output_file, "w", encoding="utf-8") as f:
        for ex in examples:
            entry = {
                "messages": [
                    {"role": "user", "content": ex["prompt"]},
                    {"role": "assistant", "content": ex["response"]}
                ],
                "mode": ex["mode"]
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    
    print(f"\n✅ Training data saved: {output_file}")
    print(f"\n💡 Next Steps:")
    print(f"   1. Isko Ollama/LoRA mein use karo:")
    print(f"      ollama create pyslim-v2 -f Modelfile")
    print(f"   2. Modelfile mein FROM base model + adapter path do")
    print(f"   3. Train hone ke baad config.json update karo")
    
    # Step 4: Config update (for dynamic loading)
    config = {
        "current_model": "gpt-oss-120b",
        "last_trained": timestamp,
        "training_examples": len(examples),
        "base_url": "https://api.cerebras.ai/v1"
    }
    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"\n⚙️  config.json updated")
    print(f"\n{'=' * 60}")
    print("Training pipeline complete!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
