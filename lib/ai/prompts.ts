// Prompt builders. Each returns { system, prompt } strings (the fal openrouter
// endpoint takes them as separate fields).

export type Prompt = { system: string; prompt: string };

export function foodVisionPrompt(locale: "tr" | "en" | "zh" = "en"): Prompt {
  // For zh the AI replies in Chinese (dish name + notes). en/tr stay English.
  if (locale === "zh") {
    const system =
      "你是一名营养师。观察食物照片并估算热量与宏量营养素。仅返回有效的 JSON，不要任何解释性文字或 markdown。";

    const prompt = `估算这道菜并返回 JSON：
{
  "name": "简洁的中文菜名",
  "kcal": <总热量>,
  "protein_g": <克>,
  "carbs_g": <克>,
  "fat_g": <克>,
  "confidence": <0..1>,
  "notes": "中文份量假设说明"
}
若份量不明确，按典型单人份估算。仅返回 JSON。`;

    return { system, prompt };
  }

  const system =
    "You are a nutritionist. Look at the food photo and estimate calories and macros. Return ONLY valid JSON, no prose, no markdown.";

  const prompt = `Estimate this dish and return JSON:
{
  "name": "concise English dish name",
  "kcal": <total>,
  "protein_g": <g>,
  "carbs_g": <g>,
  "fat_g": <g>,
  "confidence": <0..1>,
  "notes": "English assumptions"
}
If portion unclear, assume a typical single serving. JSON only.`;

  return { system, prompt };
}

export type FoodVisionParseInput = {
  locale: "tr" | "en" | "zh";
  /** Optional user text description to supplement the photo. */
  text?: string;
  defaultMeal?: "breakfast" | "lunch" | "dinner" | "snack";
};

export function foodVisionParsePrompt(p: FoodVisionParseInput): Prompt {
  const textHint = p.text?.trim()
    ? p.locale === "zh"
      ? `\n用户额外描述："""\n${p.text.trim()}\n"""\n请结合照片与文字描述进行估算。`
      : `\nUser additional description:\n"""\n${p.text.trim()}\n"""\nUse both the photo and this text for your estimate.`
    : "";

  const mealHint = p.defaultMeal
    ? p.locale === "zh"
      ? `若无法从照片判断餐别，默认为 ${p.defaultMeal}。`
      : `If meal slot is unclear, default to ${p.defaultMeal}.`
    : "";

  if (p.locale === "zh") {
    const system = `你是一名营养师。观察食物照片${p.text ? "并结合文字描述" : ""}，估算每道菜的热量与宏量营养素。若照片中有多道菜，拆分为多项。仅返回有效的 JSON，不要任何解释性文字或 markdown。`;

    const prompt = `观察照片${textHint}
${mealHint}

返回 JSON 格式：
{
  "meal": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "name": "简洁的中文菜名",
      "quantity": "可读的中文份量摘要",
      "kcal": <总热量，整数>,
      "protein_g": <克>,
      "carbs_g": <克>,
      "fat_g": <克>,
      "notes": "关于估算的中文说明（可选，简短）"
    }
  ],
  "confidence": <0..1>,
  "search_used": false
}

若份量不明确，按典型单人份估算。仅输出 JSON 对象，不要 \`\`\` 包裹，不要任何说明。`;

    return { system, prompt };
  }

  const system = `You are a nutritionist. Look at the food photo${p.text ? " and consider the user's text description" : ""}, estimate calories and macros for each dish. If multiple dishes are visible, split into separate items. Return ONLY valid JSON, no prose, no markdown.`;

  const prompt = `Analyze the photo${textHint}
${mealHint}

Return JSON exactly:
{
  "meal": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "name": "concise English dish name",
      "quantity": "human-readable English portion summary",
      "kcal": <total kcal, integer>,
      "protein_g": <g>,
      "carbs_g": <g>,
      "fat_g": <g>,
      "notes": "any English caveats (optional, short)"
    }
  ],
  "confidence": <0..1>,
  "search_used": false
}

If portion unclear, assume a typical single serving. Output ONLY the JSON object. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export type PlanInput = {
  locale: "tr" | "en" | "zh";
  goal: "cut" | "maintain" | "bulk";
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  liked: string[];
  disliked: string[];
  allergies: string[];
  pantry: { name: string; qty?: number | null; unit?: string | null }[];
  recentMeals: string[];
  daysCount: number;
};

export function weeklyPlanPrompt(p: PlanInput): Prompt {
  // For zh the AI replies in Chinese with Chinese hand-measure portions.
  // en/tr keep the existing English + Turkish hand-measure behavior.
  if (p.locale === "zh") {
    const system = `你是一名营养师，为用户制定每周饮食计划。仅返回一个有效的 JSON 对象——不要任何解释性文字或 markdown。使用中文菜名和食材名，但每项的"portion"份量字符串请使用中式手量份量描述，并附上克数/个的换算。

手量份量参考（描述份量时使用）：
- 一个手掌心：~100-150 g 肉/鱼/禽
- 一个拳头：~1 杯 / ~150-200 g 米饭、面条、豆类或水果
- 拳头前侧：~½ 杯
- 拳头内侧：~1 整杯体积
- 大拇指指尖：~½ 汤匙 = ~7 g 油/花生酱/奶酪
- 食指指尖：~1 茶匙 = ~5 g
- 1 个火柴盒大小的奶酪：~30 g
- 1 片面包：~25-35 g
- 1 张卷饼/烙饼：~40-60 g
- 1 个中等大小的鸡蛋：~50 g
- 1 把坚果：~30 g`;

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `目标：${p.goal}（~${p.targetKcal} 千卡/天）
宏量营养素目标：蛋白质 ${p.proteinG}g，碳水 ${p.carbsG}g，脂肪 ${p.fatG}g。
喜欢的：${p.liked.join("、") || "无"}
不喜欢的：${p.disliked.join("、") || "无"}
过敏：${p.allergies.join("、") || "无"}
现有食材：${
      p.pantry
        .map((x) => `${x.name}${x.qty ? `（${x.qty}${x.unit ?? ""}）` : ""}`)
        .join("、") || "无"
    }
近期吃过的（避免大量重复）：${
      p.recentMeals.slice(0, 20).join("、") || "无"
    }

生成从 ${today} 开始的 ${p.daysCount} 天饮食计划。每天的热量与宏量营养素应接近目标值。
优先使用现有食材；尽量减少新购物清单项。

每项餐食必须包含"portion"份量字符串，使用中式手量份量描述并附上克数/个的换算，以便用户无需电子秤即可准备。示例：
  - "1 个手掌心（~150 g）"
  - "1 个拳头米饭（~180 g 熟重）"
  - "2 汤匙橄榄油（~25 g）"
  - "1 个大拇指指尖花生酱（~7 g）"
  - "1 个火柴盒大小的奶酪（~30 g）"
  - "2 个中等大小的鸡蛋（~100 g）"

返回 JSON 格式：
{
  "starts_on": "YYYY-MM-DD",
  "ends_on": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "breakfast": [{ "name": "...", "portion": "中式手量份量 + （~g）", "kcal": N, "protein_g": N, "carbs_g": N, "fat_g": N, "ingredients": [{"name":"...","qty":N,"unit":"g|ml|个"}] }],
      "lunch": [...],
      "dinner": [...],
      "snacks": [...],
      "totals": { "kcal": N, "protein_g": N, "carbs_g": N, "fat_g": N }
    }
  ],
  "shopping_list": [{ "name": "...", "qty": N, "unit": "g|ml|个", "aisle": "produce|meat|dairy|pantry|frozen|other" }]
}

从购物清单中扣除现有食材的用量，使其仅表示"仍需购买"的部分。
仅输出 JSON 对象。不要 \`\`\` 包裹，不要任何说明。`;

    return { system, prompt };
  }

  // en/tr — always respond with English meal names regardless of p.locale
  // (kept for API stability). The system prompt below carries Turkish
  // hand-measure idioms so we can still parse "1 kibrit kutusu peynir".
  const system = `You are a dietitian crafting weekly meal plans for a Turkish user. Return ONLY a single valid JSON object — no prose, no markdown. Use English meal and ingredient names, but write the per-item PORTION string in a Turkish hand-measure ("el ölçüsü") idiom plus a grams/adet fallback.

Hand-measure cheatsheet (use these when describing portions):
- Avuç içi (palm of hand): ~100-150 g of meat/fish/poultry
- Yumruk (closed fist): ~1 cup / ~150-200 g cooked rice, pasta, beans, or fruit
- Sıkılı yumruğun ön tarafı (front of fist): ~½ cup
- Sıkılı yumruğun iç tarafı (inside of fist): ~1 full glass volume
- Baş parmak ucu (thumb tip): ~½ tablespoon = ~7 g of oil/peanut butter/cheese
- İşaret parmak ucu (index fingertip): ~1 teaspoon = ~5 g
- 1 kibrit kutusu peynir (matchbox of cheese): ~30 g
- 1 dilim ekmek (slice of bread): ~25-35 g
- 1 lavaş: ~40-60 g flatbread
- 1 orta boy yumurta: ~50 g
- 1 avuç fındık/badem (handful of nuts): ~30 g`;

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Goal: ${p.goal} (~${p.targetKcal} kcal/day)
Macros target: protein ${p.proteinG}g, carbs ${p.carbsG}g, fat ${p.fatG}g.
Liked: ${p.liked.join(", ") || "-"}
Disliked: ${p.disliked.join(", ") || "-"}
Allergies: ${p.allergies.join(", ") || "-"}
Pantry on hand: ${
    p.pantry
      .map((x) => `${x.name}${x.qty ? ` (${x.qty}${x.unit ?? ""})` : ""}`)
      .join(", ") || "empty"
  }
Recently eaten (avoid repeating heavily): ${
    p.recentMeals.slice(0, 20).join(", ") || "-"
  }

Generate a ${p.daysCount}-day meal plan starting ${today}. Each day MUST be close to the kcal & macro targets.
Use pantry items first; minimize new shopping items.

Every meal item MUST include a "portion" string that uses Turkish hand-measure idioms PLUS a grams/adet fallback so the user can prepare it without a scale. Examples:
  - "1 avuç içi (~150 g)"
  - "1 yumruk pirinç (~180 g pişmiş)"
  - "2 yemek kaşığı zeytinyağı (~25 g)"
  - "1 baş parmak ucu fıstık ezmesi (~7 g)"
  - "1 kibrit kutusu beyaz peynir (~30 g)"
  - "2 orta boy yumurta (~100 g)"

Return JSON exactly:
{
  "starts_on": "YYYY-MM-DD",
  "ends_on": "YYYY-MM-DD",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "breakfast": [{ "name": "...", "portion": "Turkish hand-measure idiom + (~g)", "kcal": N, "protein_g": N, "carbs_g": N, "fat_g": N, "ingredients": [{"name":"...","qty":N,"unit":"g|ml|adet"}] }],
      "lunch": [...],
      "dinner": [...],
      "snacks": [...],
      "totals": { "kcal": N, "protein_g": N, "carbs_g": N, "fat_g": N }
    }
  ],
  "shopping_list": [{ "name": "...", "qty": N, "unit": "g|ml|adet", "aisle": "produce|meat|dairy|pantry|frozen|other" }]
}

Subtract pantry quantities from shopping_list so it represents what STILL needs to be bought.
Output ONLY the JSON object. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export type InsightsInput = {
  locale: "tr" | "en" | "zh";
  weekStart: string;
  weekEnd: string;
  kcalTarget: number;
  dailyKcal: number[];
  proteinDaily: number[];
  workoutCount: number;
  workoutVolumeKg: number;
  recoveryScores: number[];
  sleepHours: number[];
  bodyWeightStart?: number | null;
  bodyWeightEnd?: number | null;
  goal: "cut" | "maintain" | "bulk";
};

export type ProgramInput = {
  locale: "tr" | "en" | "zh";
  goal: "strength" | "hypertrophy" | "fat_loss" | "general" | "endurance";
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  focus?: string;
  injuries?: string;
  recoveryAvg?: number | null;
  sleepAvgHours?: number | null;
};

const BODY_PARTS = [
  "chest",
  "back",
  "shoulders",
  "upper arms",
  "lower arms",
  "upper legs",
  "lower legs",
  "waist",
  "cardio",
  "neck",
];

export function programGeneratorPrompt(p: ProgramInput): Prompt {
  const system =
    p.locale === "tr"
      ? "Sen lisanslı bir kuvvet & kondisyon koçusun. Kullanıcının hedefi, deneyimi ve ekipmanına göre haftalık bir antrenman programı kur. SADECE tek bir geçerli JSON objesi döndür — Markdown veya açıklama yazma. Egzersiz isimlerini İngilizce olarak ver (ör. 'barbell bench press') ki sistem onları egzersiz veri tabanıyla eşleştirebilsin."
      : p.locale === "zh"
        ? "你是一名持证的体能与力量教练。根据用户的目标、经验和器材，制定每周训练计划。仅返回一个有效的 JSON 对象——不要 markdown，不要任何解释性文字。请使用英文动作名称（例如 'barbell bench press'），以便系统将它们与动作数据库匹配。"
        : "You are a certified strength & conditioning coach. Build a weekly training program tailored to the user's goal, experience and equipment. Return ONLY a single valid JSON object — no markdown, no prose. Use English exercise names (e.g. 'barbell bench press') so the system can match them to the exercise database.";

  const prompt = `Goal: ${p.goal}
Experience level: ${p.level}
Days per week: ${p.daysPerWeek}
Session length: ~${p.sessionMinutes} min
Equipment available: ${p.equipment.length ? p.equipment.join(", ") : "full commercial gym"}
${p.focus ? `Focus / preferences: ${p.focus}` : ""}
${p.injuries ? `Injuries / contraindications: ${p.injuries}` : ""}
${p.recoveryAvg != null ? `Recent recovery avg (Whoop, 0-100): ${p.recoveryAvg}` : ""}
${p.sleepAvgHours != null ? `Recent sleep avg: ${p.sleepAvgHours.toFixed(1)}h` : ""}

Design exactly ${p.daysPerWeek} training day(s) per week.
Each day must have between 4 and 8 exercises, sequenced from compound to isolation.
Set/rep prescription must match the goal:
  - strength: 3-5 sets × 3-6 reps for big lifts, 8-12 reps for accessories
  - hypertrophy: 3-4 sets × 6-12 reps
  - fat_loss: 3-4 sets × 10-15 reps, short rest
  - endurance: 2-3 sets × 12-20 reps
  - general: 3 sets × 8-12 reps

Return JSON exactly:
{
  "name": "concise program name",
  "description": "1-3 sentence overview, including weekly split logic.",
  "days": [
    {
      "name": "Day 1 — <focus>",
      "focus": "push | pull | legs | upper | lower | full | …",
      "exercises": [
        {
          "search": "english exercise name (lowercase), e.g. 'barbell back squat'",
          "body_part": "one of: ${BODY_PARTS.join(" | ")}",
          "equipment": "e.g. barbell, dumbbell, cable, bodyweight, machine",
          "sets": <int>,
          "reps": <int>,
          "rest_seconds": <int 30-300>,
          "notes": "form cue or progression hint (optional, brief)"
        }
      ]
    }
  ]
}

Output ONLY the JSON. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export type MealParserInput = {
  locale: "tr" | "en" | "zh";
  text: string;
  nowIso: string;
  defaultMeal?: "breakfast" | "lunch" | "dinner" | "snack";
  /** When editing an existing entry, pass its current values so the AI can merge or correct instead of replacing. */
  existing?: {
    name: string;
    kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
};

function existingBlock(p: MealParserInput): string {
  const e = p.existing;
  if (!e) return "";
  const fmt = (n: number | null) => (n != null ? `${n}g` : "—");
  if (p.locale === "zh") {
    return `\n用户正在编辑一条已有的餐食记录，当前值为：\n  名称："${e.name}"\n  热量：${e.kcal ?? "—"}，蛋白质：${fmt(e.protein_g)}，碳水：${fmt(e.carbs_g)}，脂肪：${fmt(e.fat_g)}\n\n新输入可能是修正（如"其实吃了两片，不是一片"→替换）或补充（如"还有半碗米饭"→合并）。返回更新后的完整条目——如果现有内容应保留，则包含现有项目和新输入的项目，而不仅是新输入。\n`;
  }
  return `\nThe user is EDITING an existing food entry with these current values:\n  Name: "${e.name}"\n  Kcal: ${e.kcal ?? "—"}, Protein: ${fmt(e.protein_g)}, Carbs: ${fmt(e.carbs_g)}, Fat: ${fmt(e.fat_g)}\n\nThe new input may be a CORRECTION ("actually it was 2 slices, not 1" → replace) or an ADDITION ("add half avocado" → merge). Return the COMPLETE updated entry — all items including the existing ones if they should be kept, not just the new input.\n`;
}

export function mealParserPrompt(p: MealParserInput): Prompt {
  // For zh the AI replies in Chinese (item names + notes). en/tr keep the
  // existing English-output behavior but still recognize Turkish portion idioms.
  if (p.locale === "zh") {
    const system = `你是一名个人营养助手。仔细分析用户自由文本形式的餐饮描述（可能为中文或英文），并估算每项的热量与宏量营养素。

你应识别的份量表达：
- "火柴盒大小的奶酪" / "1 个火柴盒奶酪" ≈ 30 g
- "手掌心大小的肉" / "1 个手掌心肉" ≈ 100-150 g
- "一把" / "1 把" ≈ 30-40 g（坚果 ~30 g）
- "一汤匙油" / "1 汤匙油" ≈ 12-15 g
- "一片面包" / "1 片面包" ≈ 25-35 g
- "卷饼/烙饼" / "1 张卷饼" ≈ 40-60 g
- "中等大小的鸡蛋" / "1 个鸡蛋" ≈ 50 g

对于组合菜（如"卷饼加蛋、牛油果、酱"），将所有食材合并为一项。明确标注为"额外"/"再加"/"加一份"的项作为单独项。

当份量、品牌热量或不熟悉的食物不确定时，搜索网络。始终输出中文菜名和说明。仅返回有效的 JSON——不要任何解释性文字或 markdown。`;

    const today = p.nowIso.slice(0, 10);
    const hint = p.defaultMeal ? `若未指定餐别，默认为：${p.defaultMeal}。` : "";

    const prompt = `今天：${today}
${hint}
${existingBlock(p)}
用户输入：
"""
${p.text.trim()}
"""

从"早餐/breakfast"、"午餐/lunch"、"晚餐/dinner"、"加餐/snack"等词判断餐别——否则默认为 ${p.defaultMeal ?? "snack"}。

解析为各项。对于组合菜，将食材合并为一项；否则将标注为"额外"/"再加"的内容单独拆出。

返回 JSON 格式：
{
  "meal": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "name": "简洁的中文菜名",
      "quantity": "可读的中文份量摘要，例如 '1 个卷饼（卷饼 + 鸡蛋 + ½ 个牛油果 + 酸奶柠檬酱）'",
      "kcal": <总热量，整数>,
      "protein_g": <克>,
      "carbs_g": <克>,
      "fat_g": <克>,
      "notes": "关于估算的中文说明（可选，简短）"
    }
  ],
  "confidence": <0..1>,
  "search_used": <若使用了网络搜索为 true，否则 false>
}

仅输出 JSON 对象。不要 \`\`\` 包裹，不要任何说明。`;

    return { system, prompt };
  }

  // en/tr — always respond in English even when the user types or
  // speaks Turkish. The system prompt below carries Turkish portion idioms
  // so we can still parse "1 kibrit kutusu peynir", but item names + notes
  // come back in English.
  const system = `You are a personal nutrition assistant. Carefully analyze the user's free-form meal description (which may be in English or Turkish) and estimate the calories + macros for each item.

Portion idioms you should recognize:
- "matchbox of cheese" / "1 kibrit kutusu peynir" ≈ 30 g
- "palm of meat" / "1 yumruk et" ≈ 100-150 g
- "handful" / "1 avuç" ≈ 30-40 g (nuts ~30 g)
- "tablespoon of oil" / "1 yemek kaşığı yağ" ≈ 12-15 g
- "slice of bread" / "1 dilim ekmek" ≈ 25-35 g
- "lavash" / "1 lavaş" ≈ 40-60 g flatbread
- "medium egg" / "1 orta boy yumurta" ≈ 50 g

For composed dishes ("wrap with egg, avocado, sauce" / "lavaş içinde yumurta, avokado, sos") combine ALL ingredients into ONE item. Items explicitly tagged as "extra" / "plus" / "ek olarak" / "yanında" become separate items.

When unsure about portion sizes, brand calories, or unfamiliar foods, search the web. Always output English item names and notes regardless of the input language. Return ONLY valid JSON — no prose, no markdown.`;

  const today = p.nowIso.slice(0, 10);
  const hint = p.defaultMeal ? `Default meal slot if not specified: ${p.defaultMeal}.` : "";

  const prompt = `Today: ${today}
${hint}
${existingBlock(p)}
User input:
"""
${p.text.trim()}
"""

Detect meal slot from words like "breakfast/kahvaltı", "lunch/öğle", "dinner/akşam", "snack/ara öğün" — otherwise default to ${p.defaultMeal ?? "snack"}.

Parse into items. For composed dishes, combine ingredients into a single item; otherwise split out anything labeled "extra"/"plus"/"ek olarak"/"yanında".

Return JSON exactly:
{
  "meal": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    {
      "name": "concise English dish name",
      "quantity": "human-readable English portion summary, e.g. '1 wrap (lavash + egg + ½ avocado + yogurt-lemon sauce)'",
      "kcal": <total kcal, integer>,
      "protein_g": <g>,
      "carbs_g": <g>,
      "fat_g": <g>,
      "notes": "any English caveats about the estimate (optional, short)"
    }
  ],
  "confidence": <0..1>,
  "search_used": <true if you used web search, else false>
}

Output ONLY the JSON object. No \`\`\` fences, no commentary.`;

  return { system, prompt };
}

export function weeklyInsightsPrompt(i: InsightsInput): Prompt {
  // For zh the AI replies in Chinese. en/tr keep the existing English advice.
  if (i.locale === "zh") {
    const system =
      "你是一名私人健身教练。解读每周的各项指标并给出可执行的中文建议。仅返回一个有效的 JSON 对象。";

    const prompt = `本周：${i.weekStart} → ${i.weekEnd}
目标：${i.goal}（目标 ${i.kcalTarget} 千卡/天）
每日热量：${i.dailyKcal.join("、")}
每日蛋白质（克）：${i.proteinDaily.join("、")}
训练次数：${i.workoutCount}，总训练量：${i.workoutVolumeKg.toFixed(0)} kg-次
恢复评分：${i.recoveryScores.join("、") || "—"}
睡眠时长：${i.sleepHours.map((h) => h.toFixed(1)).join("、") || "—"}
体重：${i.bodyWeightStart ?? "—"} → ${i.bodyWeightEnd ?? "—"} kg

返回 JSON：
{
  "summary": "2-3 句中文总结",
  "highlights": ["1-3 件表现不错的事"],
  "warnings": ["0-3 件需要注意的事"],
  "recommendations": ["2-4 条本周可执行的具体行动"]
}
仅输出 JSON。不要任何说明。`;

    return { system, prompt };
  }

  const system =
    "You are a personal fitness coach. Interpret the weekly metrics and give actionable English advice. Return ONLY a single valid JSON object.";

  const prompt = `Week: ${i.weekStart} → ${i.weekEnd}
Goal: ${i.goal} (target ${i.kcalTarget} kcal/day)
Daily kcal: ${i.dailyKcal.join(", ")}
Daily protein (g): ${i.proteinDaily.join(", ")}
Workouts: ${i.workoutCount}, total volume: ${i.workoutVolumeKg.toFixed(0)} kg-reps
Recovery scores: ${i.recoveryScores.join(", ") || "—"}
Sleep hours: ${i.sleepHours.map((h) => h.toFixed(1)).join(", ") || "—"}
Body weight: ${i.bodyWeightStart ?? "—"} → ${i.bodyWeightEnd ?? "—"} kg

Return JSON:
{
  "summary": "2-3 sentence English summary",
  "highlights": ["1-3 things that went well"],
  "warnings": ["0-3 things to watch out for"],
  "recommendations": ["2-4 concrete actions for this week"]
}
Output ONLY the JSON. No commentary.`;

  return { system, prompt };
}
