# Apple Health → LifeOS 体重同步

将 iPhone 健康中的体重、体脂率、肌肉量、去脂体重数据同步到 LifeOS。

## 前置准备

1. 打开 LifeOS → **Profile** → **APPLE HEALTH 同步**
2. 点击 **GENERATE TOKEN** 生成同步 Token
3. 复制 **同步地址**（例如 `https://your-domain/api/health/import`）
4. 复制 **Token**（例如 `a1b2c3d4...`，64 位十六进制字符串）

> Token 随时可在 Profile 页面查看和复制。如果丢失，点击 REGENERATE 重新生成。

---

## Shortcut 1: 每日同步

每天自动同步最近 10 条记录，防止遗漏。建议设为每日自动化运行。

### 创建步骤

打开 **快捷指令** App → 右上角 **+** 新建快捷指令，命名为 `LifeOS 每日同步`。

体重、体脂率、肌肉量、去脂体重四个模块结构相同，仅健康数据类型和 JSON 字段名不同。以下以体重为例完整说明，其余三个模块仅替换标注的参数。

---

### 模块 A：同步体重

#### Step 1: 查找健康样本

搜索动作：**查找健康样本** / Find Health Samples

配置：

- **类型**：身体质量 (Body Mass)
- **限制**：10
- **排序依据**：开始日期 (Start Date)
- **顺序**：最新优先 (Latest First)

#### Step 2: 初始化数组变量

搜索动作：**创建列表** / List

保持列表为空（不添加任何项）。

搜索动作：**设定变量** / Set Variable

- **变量名**：`weightSamples`
- **输入**：上面的空列表

> 用空列表作为数组初始化比直接设空值更稳妥，确保后续「添加到变量」操作能正确追加。

#### Step 3: 构建样本数组（重复遍历）

搜索动作：**重复遍历** / Repeat with Each

- **输入**：查找健康样本的结果

在重复循环内部依次添加以下操作：

**3a. 格式化日期**

搜索动作：**格式化日期** / Format Date

- **日期**：重复项 的 开始日期 (Start Date)
- **日期格式**：自定义 (Custom)
- **格式字符串**：`yyyy-MM-dd'T'HH:mm:ssXXX`

> 使用 `XXX` 代替 `Z`，可输出标准的 `+08:00` ISO-8601 时区偏移，避免后端解析异常。

**3b. 获取数值**

重复项的 **值** (Value) 直接可用，无需额外操作。

> 确认 iPhone 健康设置中单位已固定为 kg。若担心单位影响，点击重复项选择 Value 后在弹窗中将单位硬性指定为 kg。

**3c. 构建字典**

搜索动作：**字典** / Dictionary

键值对：

- `recordedAt`（文本 / Text）→ 选入 Step 3a 格式化日期的输出
- `weightKg`（数字 / Number）→ 选入 重复项 的 值 (Value)，点击该变量将类型改为 **数字 / Number**

**3d. 追加到数组**

搜索动作：**添加到变量** / Add to Variable

- **输入**：Step 3c 创建的字典
- **变量名**：`weightSamples`

#### Step 4: 发送数据

搜索动作：**获取 URL 的内容** / Get Contents of URL

配置：

- **URL**：`https://your-domain/api/health/import`
- **方法**：POST
- **请求头** (Headers)：
  - `Authorization` = `Bearer 你的Token`
  - `Content-Type` = `application/json`
- **请求主体** (Request Body)：JSON

添加新键：

- **键** (Key)：`samples`
- **类型** (Type)：阵列 / Array
- **值** (Value)：选择变量 `weightSamples`

#### Step 5: 显示结果

搜索动作：**显示结果** / Show Result

- **输入**：获取 URL 的内容 的输出

运行后会显示返回的 JSON，确认 `imported` 数量。

---

### 模块 B：同步体脂率

重复模块 A 的全部步骤，仅修改以下参数：

| 配置项 | 修改为 |
|---|---|
| 查找健康样本 → 类型 | **体脂率** (Body Fat Percentage) |
| 设定变量名 | `bodyFatSamples` |
| 字典字段名 | `bodyFatPct`（替代 `weightKg`） |
| 添加到变量名 | `bodyFatSamples` |

HealthKit 体脂率返回值为百分比数字（如 15.2 表示 15.2%），直接取 **值** 字段。

---

### 模块 C：同步肌肉量

重复模块 A 的全部步骤，仅修改以下参数：

| 配置项 | 修改为 |
|---|---|
| 查找健康样本 → 类型 | **去脂体重** (Lean Body Mass) |
| 设定变量名 | `muscleSamples` |
| 字典字段名 | `muscleMassKg`（替代 `weightKg`） |
| 添加到变量名 | `muscleSamples` |

> HealthKit 没有「肌肉量」类型，最接近的是 **去脂体重**（包含器官、骨骼等）。智能秤 App 写入的「肌肉量」通常映射到这个类型。如果你的智能秤只输出「去脂体重」而没有真正的「肌肉量」数据，建议跳过本模块，仅使用模块 D 同步去脂体重。

---

### 模块 D：同步去脂体重

重复模块 A 的全部步骤，仅修改以下参数：

| 配置项 | 修改为 |
|---|---|
| 查找健康样本 → 类型 | **去脂体重** (Lean Body Mass) |
| 设定变量名 | `leanBodyMassSamples` |
| 字典字段名 | `leanBodyMassKg`（替代 `weightKg`） |
| 添加到变量名 | `leanBodyMassSamples` |

> **去脂体重**（Lean Body Mass）= 体重 − 体脂重量，包含肌肉、器官、骨骼、水分等。如果你的智能秤同时写入「肌肉量」和「去脂体重」两个类型，可以同时启用模块 C 和模块 D。如果只输出「去脂体重」，建议仅使用本模块，跳过模块 C。

---

### 设置每日自动化

1. 打开 **快捷指令** App → 底部标签栏选择 **自动化**
2. 点击右上角 **+** → 选择 **创建个人自动化**
3. 选择 **时间** → 设定时间（例如 8:00）
4. 重复设为 **每天**
5. 点击 **下一步**
6. 点击 **添加操作** → 搜索 **运行快捷指令**
7. 点击「快捷指令」→ 选择 `LifeOS 每日同步`
8. 点击 **下一步** → 关闭 **运行前询问** → 点击 **完成**

---

## Shortcut 2: 历史导入

手动运行一次，导入全部历史数据到 LifeOS。

### 创建步骤

新建快捷指令，命名为 `LifeOS 历史导入`。

### Step 1: 选择起始日期

搜索动作：**要求输入日期** / Ask for Date

- **提示**：`选择导入起始日期`
- **默认值**：5 年前的今天（或你希望的起始时间）

### Step 2-5: 同步四种指标

对体重、体脂率、肌肉量、去脂体重分别重复以下结构。与每日同步的区别是：**添加筛选条件**、**限制改为 5000**、**排序改为最早优先**。

#### 查找健康样本

搜索动作：**查找健康样本** / Find Health Samples

配置：

- **类型**：身体质量 / 体脂率 / 去脂体重 / 肌肉量（见下方表格）
- **筛选**：添加条件 → **开始日期** → **大于或等于** → 值设为 Step 1 的日期变量
- **排序依据**：开始日期 (Start Date)
- **顺序**：最早优先 (Earliest First)
- **限制**：5000

#### 构建数组并发送

与每日同步完全相同：

1. **创建列表**（空列表）→ **设定变量** `weightSamples`（或对应名称）
2. **重复遍历** → **格式化日期** → **字典** → **添加到变量**
3. **获取 URL 的内容** → POST `{ samples: [...] }`
4. **显示结果**

#### 四种指标的配置差异

| 指标 | 健康数据类型 | 变量名 | 字段名 |
|---|---|---|---|
| 体重 | 身体质量 (Body Mass) | `weightSamples` | `weightKg` |
| 体脂率 | 体脂率 (Body Fat Percentage) | `bodyFatSamples` | `bodyFatPct` |
| 肌肉量 | 去脂体重 (Lean Body Mass) | `muscleSamples` | `muscleMassKg` |
| 去脂体重 | 去脂体重 (Lean Body Mass) | `leanBodyMassSamples` | `leanBodyMassKg` |

### 运行

手动运行一次快捷指令即可。四种指标分 4 次 POST 请求，每次最多 5000 条。如果历史数据超过 5000 条，可分多个日期范围多次运行。

---

## 请求格式参考

### 单条数据

```json
{
  "recordedAt": "2024-01-15T08:30:00+08:00",
  "weightKg": 74.2,
  "bodyFatPct": 15.2,
  "muscleMassKg": 62.8,
  "leanBodyMassKg": 62.9
}
```

### 批量数据

```json
{
  "samples": [
    { "recordedAt": "2024-01-15T08:30:00+08:00", "weightKg": 74.2 },
    { "recordedAt": "2024-01-16T08:25:00+08:00", "weightKg": 74.0 },
    { "recordedAt": "2024-01-17T07:50:00+08:00", "weightKg": 73.8 }
  ]
}
```

### 请求头

```
Authorization: Bearer <你的Token>
Content-Type: application/json
```

### 成功响应

```json
{
  "imported": 10,
  "latestWeight": 74.2
}
```

---

## 常见问题

### 首次运行时提示授权

首次使用「查找健康样本」时，iPhone 会弹出健康数据授权请求，需点击 **允许** 并勾选所需数据类型。

### 日期格式不对

在重复遍历中插入 **格式化日期** 操作，自定义格式输入 `yyyy-MM-dd'T'HH:mm:ssXXX`。`XXX` 输出 `+08:00` 格式的时区偏移，比 `Z` 更兼容。

### 体重/体脂/肌肉量/去脂体重的时间戳不一致

同一次称重的四种指标可能时间戳略有偏差（差几秒），服务端会按 `(userId, recordedAt, source)` 去重。如果时间戳不同，会产生独立的行，LifeOS 分析页面会按日聚合取最轻值，不影响趋势线。

### 重复运行安全吗

安全。服务端使用 `ON CONFLICT DO UPDATE`，同时间戳的数据会合并（取非空值），不会产生重复行。可以放心重复运行。

### 如何验证同步成功

1. 运行 Shortcut 后查看返回的 `imported` 数量
2. 打开 LifeOS → **Analysis** → 体重趋势图应显示新数据
3. 打开 LifeOS → **Profile** → Apple Health 同步卡片 → **最近同步** 时间应更新

### 同一日期多次称重

LifeOS 会保留所有记录，分析页体重趋势按日取最轻值（晨重基线），`profile.weight_kg` 也取当日最轻值用于 TDEE/BMI 计算。

### Token 丢失

打开 Profile → Apple Health 同步 → Token 随时可复制。如需重置，点击 REGENERATE 生成新 Token，旧 Token 立即失效，需更新快捷指令中的 Bearer Token。
