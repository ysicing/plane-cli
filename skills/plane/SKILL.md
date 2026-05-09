---
name: plane
description: 管理 Plane 工作项与项目能力。当用户提到工作项标识（如 GAEA-30）或需要查询/维护 Plane 项目、工作项、评论、链接、关系、附件、成员、features 时使用。
---

# Plane Skill

通过本机安装的 `plane` 命令管理 Plane。

## 严格要求

- 优先使用 `plane` 命令，不要手写 curl 直接调 Plane API
- 自动化消费结果时，优先加 `--json`
- 用户消息中只要出现工作项标识（如 `GAEA-30`、`TEST-12`），优先先查询该工作项
- 如果提交代码，commit message 必须包含工作项标识与工时，格式：

```text
<type>(scope): <summary> #<工作项标识> Cost:<工时>
```

示例：

```text
feat(cli): 完善 issue 链接管理 #GAEA-30 Cost:30m
```

## 意图判断

用户提到：

- `GAEA-30`、`TEST-12`、`OPS-7` 这类标识
- 工作项 / issue / work item
- 项目 / project
- 标签 / label
- 评论 / comment
- 活动 / activity
- 链接 / link
- 关系 / relation
- 附件 / attachment
- 成员 / members
- features / 自动化开关

则应优先考虑使用本技能。

## 触发规则

### 1. 工作项标识触发

如果用户消息中直接提到工作项标识，默认先查详情：

```bash
plane issue get GAEA-30 --json
```

如果需要继续操作，沿用同一个 key：

```bash
plane issue comments ls GAEA-30 --json
plane issue links add GAEA-30 --url 'https://example.com/doc' --json
plane issue attachments upload GAEA-30 --file ./spec.pdf --json
```

### 2. 多 workspace 场景

如果账号下存在多个 workspace，先确认当前 workspace：

```bash
plane workspace current
plane workspace ls
plane workspace use <slug>
```

### 3. 代码提交场景

如果当前任务涉及代码实现、修复、重构、测试补充，并且要提交代码，则 commit message 使用：

```text
<type>(scope): <summary> #GAEA-30 Cost:30m
```

细化规则如下：

- 只有在**实际提交代码**时才追加 `#<工作项标识> Cost:<工时>`
- 若本次改动没有明确工作项标识，则不要伪造工作项标识
- 若本次改动明确只对应一个工作项，则追加一个标识：

```text
feat(cli): 完善 issue 链接管理 #GAEA-30 Cost:30m
```

- 若本次改动同时覆盖多个工作项，优先拆分为多个提交；若确实只能一次提交，则在同一条 commit message 末尾顺序追加多个标识：

```text
refactor(cli): 收敛 issue 帮助信息 #GAEA-30 Cost:20m #GAEA-31 Cost:15m
```

- `type(scope): summary` 仍然遵循仓库原有提交规范，工作项信息只是追加在末尾，不替代原规范
- `type` 建议使用：`feat` / `fix` / `refactor` / `docs` / `test` / `chore`
- `scope` 尽量使用实际改动范围，如：`cli`、`issue`、`project`、`config`
- `summary` 使用简洁中文动词短句，不加句号
- `Cost` 使用**本次提交对应工作项的实际处理耗时**，可使用小时、分钟，或小时+分钟组合，推荐格式：

```text
Cost:30m
Cost:2h
Cost:1h30m
```

- 若某个单位值为 0，则该单位不写。例如：

```text
30 分钟写成：Cost:30m
2 小时写成：Cost:2h
1 小时 30 分钟写成：Cost:1h30m
```

- `Cost` 不写小数，不写中文单位，例如以下都不推荐：

```text
Cost:0.5h
Cost:30分钟
Cost:0h30m
Cost:1h0m
Cost:0h0m
```

- 如果本次只是查询、分析、讨论，且**没有提交代码**，不要附加该标记

## 高频命令

### 基础

```bash
plane me
plane workspace current
plane workspace ls
plane workspace use <slug>
plane config list
```

### Project

```bash
plane project ls --json
plane project get <project-id> --json
plane project summary <project-id> --json
plane project create --name Demo --identifier DEMO --json
plane project update <project-id> --description 'updated description' --json
plane project members workspace --json
plane project members ls --project <project-id> --json
plane project members add --project <project-id> --member <user-id> --role member --json
plane project features get <project-id> --json
plane project features set <project-id> --epics on --milestones on --auto-transition on --json
```

### Issue / Work Item

```bash
plane issue ls --project <project-id> --json
plane issue get GAEA-30 --json
plane issue key GAEA-30 --json
plane issue search --query login --workspace-search --json
plane issue create --project <project-id> --name "First work item" --json
plane issue update --project <project-id> <issue-id> --priority high --json
```

### Labels / Comments / Activities

```bash
plane issue labels ls --project <project-id> --json
plane issue labels create --project <project-id> --name backend --color '#ff6600' --json

plane issue comments ls GAEA-30 --json
plane issue comments add GAEA-30 --html '<p>Need follow-up</p>' --json
plane issue comments update GAEA-30 <comment-id> --html '<p>Updated</p>' --json

plane issue activities ls GAEA-30 --json
```

### Links / Relations / Attachments

```bash
plane issue links ls GAEA-30 --json
plane issue links add GAEA-30 --url 'https://example.com/doc' --json
plane issue links update GAEA-30 <link-id> --url 'https://example.com/doc-v2' --json

plane issue relations ls GAEA-30 --json
plane issue relations add GAEA-30 --relation-type blocking --issues '<other-issue-id>' --json

plane issue attachments ls GAEA-30 --json
plane issue attachments upload GAEA-30 --file ./spec.pdf --json
```

## 参数规则

### 指定 Assignee

`issue create` 与 `issue update` 的 `--assignees` 支持：

- 用户 ID
- 邮箱
- 精确全名

如需查看可分配成员：

```bash
plane project members workspace --json
```

### Issue Key 自动解析

以下命令支持直接使用 `GAEA-30` 这类 key，而无需显式传 `--project`：

- `issue get`
- `issue comments ls/add/update`
- `issue activities ls`
- `issue links ls/add/update`
- `issue relations ls/add`
- `issue attachments ls/upload`

## 输出约定

- 人类阅读：默认输出
- 机器消费：`--json`
- 当命令失败时，`--json` 返回结构化错误对象

## 限制

- 默认不提供危险删除命令
- `project members ls` 受 Plane 外部 API 返回结构限制，仅稳定返回用户资料
- 某些写操作在启用读副本的实例上，可能存在短暂回读延迟
