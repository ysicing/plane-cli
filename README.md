# plane-cli

`plane-cli` 是一个基于 Plane 外部 API（`/api/v1`）的命令行工具，用于在终端中管理 workspace、project 和 work item（issue），并内置 Codex skill `plane`。

## 特性

- 支持 API Key 配置与账号密码登录
- 支持多 workspace 选择与切换
- 支持人类可读输出与结构化 JSON 输出
- 支持 `project` 查询、创建、更新、成员管理、features 开关
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
```

## 命令概览

### 基础命令

```bash
plane --help
plane me
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

plane project features get <project-id>
plane project features set <project-id> --epics on --milestones on --auto-transition on
plane project features enable-all <project-id>
```

### Issue / Work Item 命令

`work-item` 是 `issue` 的别名。

```bash
plane issue ls --project <project-id>
plane issue get --project <project-id> <issue-id>
plane issue get GAEA-25
plane issue key GAEA-25
plane issue search --query login --workspace-search

plane issue create --project <project-id> --name "First work item"
plane issue update --project <project-id> <issue-id> --priority high
```

### Issue Labels

```bash
plane issue labels ls --project <project-id>
plane issue labels create --project <project-id> --name backend --color '#ff6600'
```

### Issue Comments

```bash
plane issue comments ls GAEA-25
plane issue comments add GAEA-25 --html '<p>Need follow-up</p>'
plane issue comments update GAEA-25 <comment-id> --html '<p>Updated</p>'
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
```

## 交互与参数约定

### Issue Key 自动解析

对于以下命令，若目标是已存在的 issue，可直接使用 `GAEA-25` 这类 key，而无需显式提供 `--project` 与 issue UUID：

- `issue get`
- `issue comments ls/add/update`
- `issue activities ls`
- `issue links ls/add/update`
- `issue relations ls/add`
- `issue attachments ls/upload`

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

- 当前不提供危险删除命令
- 当前不自动回收服务端 API Token
- `project members ls` 受限于 Plane `api/v1` 返回结构，仅返回用户资料，不包含完整的 `ProjectMember` 记录字段
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
