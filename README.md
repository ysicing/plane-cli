# plane-cli

`plane-cli` 是一个基于 Plane 外部 API（`/api/v1`）的命令行工具，用于在终端中管理 workspace、project 和 work item（issue），并内置 Codex skill `plane`。

## 特性

- 支持 API Key 配置与账号密码登录
- 支持多 workspace 选择与切换
- 支持人类可读输出与结构化 JSON 输出
- 支持我的工作项与项目工作项统计查询
- 支持 `project` 查询、创建、更新、成员管理、features 开关
- 支持 workspace invitations、stickies 的查询、创建、更新、删除
- 支持 project states、cycles、modules、epics、milestones、intake 的查询、创建、更新、删除
- 支持 `issue` 查询、创建、更新、labels、comments、activities、links、relations、attachments
- 支持 `GAEA-25` 这类 issue key 自动解析

## 安装

```bash
npm install -g @ysicing/plane-cli
```

安装完成后可执行命令为：

```bash
plane
```

## 环境要求

- Node.js 22 或更高版本

## 输出格式

默认输出为人类可读格式。

如需供脚本、Agent 或流水线消费，可使用：

```bash
plane project ls --json
plane issue get GAEA-25 --format json
```

## 认证

### 方式一：直接配置 API Key

```bash
plane config set \
  --base-url https://plane.example.com \
  --api-key your-api-key \
  --workspace your-workspace-slug
```

也可通过环境变量提供：

```bash
export PLANE_BASE_URL=https://plane.example.com
export PLANE_API_KEY=your-api-key
export PLANE_WORKSPACE=your-workspace-slug
```

### 方式二：账号密码登录

```bash
plane auth login \
  --base-url https://plane.example.com \
  --username you@example.com \
  --password 'your-password'
```

### 方式三：LDAP 登录

```bash
plane auth login \
  --base-url https://plane.example.com \
  --ldap \
  --username your-ldap-user \
  --password 'your-password'
```

如需避免在命令行中直接暴露密码：

```bash
printf '%s' 'your-password' | plane auth login \
  --base-url https://plane.example.com \
  --ldap \
  --username your-ldap-user \
  --password-stdin
```

## Workspace 管理

如账号下存在多个 workspace，建议先查看并选择默认 workspace：

```bash
plane workspace current
plane workspace ls
plane workspace use <slug>
plane workspace invitations ls
plane workspace invitations get <invite-id>
plane workspace invitations create --email user@example.com --role member
plane workspace invitations update <invite-id> --role admin
plane workspace invitations delete <invite-id> --confirm
plane workspace stickies ls
plane workspace stickies get <sticky-id>
plane workspace stickies create --name "Note"
plane workspace stickies update <sticky-id> --name "Updated Note"
plane workspace stickies delete <sticky-id> --confirm
```

## 命令概览

### 基础命令

```bash
plane --help
plane me
plane me work-items --state-group started
plane me project-stats
plane config list
plane workspace current
```

### Project 命令

```bash
plane project ls
plane project get <project-id>
plane project summary <project-id>

plane project create --name Demo --identifier DEMO
plane project create --name Demo --identifier DEMO --project-lead <user-id> --default-assignee <user-id>
plane project update <project-id> --description 'updated description'

plane project members workspace
plane project members ls --project <project-id>
plane project members add --project <project-id> --member <user-id> --role member
plane project members update --project <project-id> <member-id> --role admin
plane project members delete --project <project-id> <member-id> --confirm

plane project features get <project-id>
plane project features set <project-id> --epics on --milestones on --auto-transition on
plane project features enable-all <project-id>

plane project states ls --project <project-id>
plane project states get --project <project-id> <state-id>
plane project states create --project <project-id> --name Review --color '#123456' --group started
plane project states update --project <project-id> <state-id> --name "In Review"
plane project states delete --project <project-id> <state-id> --confirm
plane project cycles ls --project <project-id> --view current
plane project cycles get --project <project-id> <cycle-id>
plane project cycles create --project <project-id> --name Sprint-1 --start-date 2026-05-11 --end-date 2026-05-18
plane project cycles update --project <project-id> <cycle-id> --name Sprint-2
plane project cycles delete --project <project-id> <cycle-id> --confirm
plane project cycles issues --project <project-id> --cycle <cycle-id>
plane project modules ls --project <project-id>
plane project modules get --project <project-id> <module-id>
plane project modules create --project <project-id> --name Backend --start-date 2026-05-11 --end-date 2026-05-18
plane project modules update --project <project-id> <module-id> --name API
plane project modules delete --project <project-id> <module-id> --confirm
plane project modules issues --project <project-id> --module <module-id>
plane project epics ls --project <project-id>
plane project epics get --project <project-id> <epic-id>
plane project epics create --project <project-id> --name Release-Epic
plane project epics update --project <project-id> <epic-id> --name Release
plane project epics delete --project <project-id> <epic-id> --confirm
plane project epics issues --project <project-id> --epic <epic-id>
plane project milestones ls --project <project-id> --search release
plane project milestones get --project <project-id> <milestone-id>
plane project milestones create --project <project-id> --title Release-1
plane project milestones update --project <project-id> <milestone-id> --title Release-2
plane project milestones delete --project <project-id> <milestone-id> --confirm
plane project intake ls --project <project-id>
plane project intake get --project <project-id> <issue-id>
plane project intake create --project <project-id> --name "Incoming request"
plane project intake update --project <project-id> <issue-id> --status 1
plane project intake delete --project <project-id> <issue-id> --confirm
```

### Issue / Work Item 命令

`work-item` 是 `issue` 的别名。

`issue mine` 会列出当前登录用户被指派的工作项；`issue todo` 会列出其中尚未完成的工作项。

```bash
plane issue ls --project <project-id>
plane issue mine
plane issue todo
plane issue get --project <project-id> <issue-id>
plane issue get GAEA-25
plane issue key GAEA-25
plane issue search --query login --workspace-search

plane issue create --project <project-id> --name "First work item"
plane issue update --project <project-id> <issue-id> --priority high
plane issue delete --project <project-id> <issue-id> --confirm
```

### Issue Labels

```bash
plane issue labels ls --project <project-id>
plane issue labels create --project <project-id> --name backend --color '#ff6600'
plane issue labels update --project <project-id> <label-id> --name backend-v2
plane issue labels delete --project <project-id> <label-id> --confirm
```

### Issue Comments

```bash
plane issue comments ls GAEA-25
plane issue comments add GAEA-25 --html '<p>Need follow-up</p>'
plane issue comments update GAEA-25 <comment-id> --html '<p>Updated</p>'
plane issue comments delete GAEA-25 <comment-id> --confirm
```

### Issue Activities

```bash
plane issue activities ls GAEA-25
```

### Issue Links

```bash
plane issue links ls GAEA-25
plane issue links add GAEA-25 --url 'https://example.com/doc'
plane issue links update GAEA-25 <link-id> --url 'https://example.com/doc-v2'
plane issue links delete GAEA-25 <link-id> --confirm
```

### Issue Epic / Milestone

```bash
plane issue epic set GAEA-25 --epic <epic-id>
plane issue epic clear GAEA-25
plane issue milestone set GAEA-25 --milestone <milestone-id>
plane issue milestone clear GAEA-25
```

### Issue Relations

```bash
plane issue relations ls GAEA-25
plane issue relations add GAEA-25 --relation-type blocking --issues '<other-issue-id>'
```

### Issue Attachments

```bash
plane issue attachments ls GAEA-25
plane issue attachments upload GAEA-25 --file ./spec.pdf
plane issue attachments delete GAEA-25 <attachment-id> --confirm
```

## 交互与参数约定

### Issue Key 自动解析

对于以下命令，若目标是已存在的 issue，可直接使用 `GAEA-25` 这类 key，而无需显式提供 `--project` 与 issue UUID：

- `issue get`
- `issue comments ls/add/update/delete`
- `issue activities ls`
- `issue links ls/add/update/delete`
- `issue epic set/clear`
- `issue milestone set/clear`
- `issue relations ls/add`
- `issue attachments ls/upload/delete`

### 指定 Assignee

`issue create` 与 `issue update` 的 `--assignees` 支持以下输入形式：

- 用户 ID
- 邮箱
- 精确全名

CLI 会自动根据 workspace 成员列表解析为后端所需的 member ID。

## Help 体系

支持以下层级的帮助信息：

```bash
plane -h
plane project -h
plane project features set --help
plane issue comments add --help
plane issue attachments upload --help
```

## 限制说明

- 当前不提供 project/workspace 删除命令；其他资源删除必须显式传入 `--confirm`
- 当前不自动回收服务端 API Token
- `project members ls` 受限于 Plane `api/v1` 返回结构，仅返回用户资料，不包含完整的 `ProjectMember` 记录字段
- `project members update/delete` 依赖 project-member 记录 ID；当前 Plane `api/v1` 的 list 响应不直接暴露该记录 ID，通常需要配合后端侧排查或额外 API 支持
- `project create` 在部分 Plane 实例上对 `project_lead/default_assignee` 的校验较严格，CLI 已采用“两段式创建”兼容该行为
- `project features set`、`issue attachments upload` 在启用读副本的实例上，可能存在短暂回读延迟

## 发布

当前包名为 `@ysicing/plane-cli`。发布前建议执行：

```bash
npm test
npm run pack:check
```

发布：

```bash
npm publish
```
