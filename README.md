# plane-cli

基于 Plane 外部 API（`/api/v1`）的轻量命令行工具，使用 Node.js 原生能力实现，不依赖第三方包。

默认输出偏人类可读；如果要给脚本、Agent 或其他自动化系统消费，统一加 `--json`：

```bash
plane workspace current
plane workspace current --json
plane issue get --project <project-id> <issue-id> --json
```

## 当前状态

这套 CLI 已经在真实 Plane 实例上做过 smoke 验证，当前重点覆盖：

- 认证与 workspace 选择
- `project` 的查询、创建、更新、成员管理、features 开关
- `issue/work-item` 的查询、创建、更新
- `issue` 的 labels、comments、activities、links、relations、attachments

适合：

- 人类直接在终端里操作
- Agent / 脚本通过 `--json` 消费结果

## 安装

```bash
npm install -g @ysicing/plane-cli
```

或直接用 `npx`：

```bash
npx @ysicing/plane-cli --help
```

## 约束

- 鉴权方式：`X-Api-Key`
- 默认面向 `project` 与 `work-item`
- 暂不提供危险删除命令

## 要求

- Node.js 22+

## 初始化

```bash
node ./src/cli.js config set \
  --base-url https://plane.example.com \
  --api-key your-api-key \
  --workspace your-workspace-slug
```

也支持环境变量覆盖：

```bash
export PLANE_BASE_URL=https://plane.example.com
export PLANE_API_KEY=your-api-key
export PLANE_WORKSPACE=your-workspace-slug
```

## 快速开始

如果已经有 API key，最短路径是：

```bash
plane config set \
  --base-url https://plane.example.com \
  --api-key your-api-key \
  --workspace your-workspace-slug

plane me
plane project ls
```

## 登录并自动生成 API Token

普通账号密码登录：

```bash
node ./src/cli.js auth login \
  --base-url https://plane.example.com \
  --username you@example.com \
  --password 'your-password'
```

LDAP 登录：

```bash
node ./src/cli.js auth login \
  --base-url https://plane.example.com \
  --ldap \
  --username your-ldap-account \
  --password 'your-password'
```

如果不想把密码放进命令行：

```bash
printf '%s' 'your-password' | node ./src/cli.js auth login \
  --base-url https://plane.example.com \
  --ldap \
  --username your-ldap-account \
  --password-stdin
```

如果账号下有多个 workspace，且没有显式传 `--workspace`，CLI 会保存登录态生成的 API token，但不会自动选中 workspace。此时请先查看并选择：

```bash
node ./src/cli.js workspace ls
node ./src/cli.js workspace current
node ./src/cli.js workspace use <slug>
```

## 常用命令

### Workspace

```bash
plane me
plane workspace current
plane workspace ls
plane workspace use <slug>
```

### Project

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
plane project features enable-all <project-id>
plane project features set <project-id> --epics on --milestones on --auto-transition on
```

### Issue / Work Item

```bash
plane issue ls --project <project-id>
plane issue get --project <project-id> <issue-id>
plane issue key DEMO-123
plane issue get DEMO-123
plane issue search --query login --workspace-search

plane issue create --project <project-id> --name "First work item"
plane issue update --project <project-id> <issue-id> --priority high

plane issue labels ls --project <project-id>
plane issue labels create --project <project-id> --name backend --color '#ff6600'

plane issue comments ls --project <project-id> <issue-id>
plane issue comments ls DEMO-123
plane issue comments add --project <project-id> <issue-id> --html '<p>Need follow-up</p>'
plane issue comments add DEMO-123 --html '<p>Need follow-up</p>'
plane issue comments update --project <project-id> <issue-id> <comment-id> --html '<p>Updated</p>'

plane issue activities ls --project <project-id> <issue-id>
plane issue activities ls DEMO-123

plane issue links ls --project <project-id> <issue-id>
plane issue links ls DEMO-123
plane issue links add --project <project-id> <issue-id> --url 'https://example.com/doc'
plane issue links update --project <project-id> <issue-id> <link-id> --url 'https://example.com/doc-v2'

plane issue relations ls --project <project-id> <issue-id>
plane issue relations ls DEMO-123
plane issue relations add --project <project-id> <issue-id> --relation-type blocking --issues '<other-issue-id>'

plane issue attachments ls --project <project-id> <issue-id>
plane issue attachments ls DEMO-123
plane issue attachments upload --project <project-id> <issue-id> --file ./spec.pdf
```

`work-item` 是 `issue` 的别名：

```bash
node ./src/cli.js work-item ls --project <project-id>
```

## AI / Agent 友好约定

- 默认输出是人类可读格式
- 加 `--json` 或 `--format json` 后，成功结果和错误结果都会变成结构化 JSON
- 参数缺失、workspace 未选择、API 返回错误时，都会带明确 `message`

示例：

```bash
plane issue get --project <project-id> <issue-id> --json
plane project ls --json
```

## 使用注意

- 多 workspace 登录后，如果没有显式传 `--workspace`，CLI 不会自动替你选择默认 workspace。先执行 `plane workspace ls`，再执行 `plane workspace use <slug>`。
- `issue create/update --assignees` 支持传用户 ID、邮箱、或精确全名。CLI 会先读取 workspace 成员再解析成后端需要的 member ID。
- `project create` 带 `--project-lead` 和 `--default-assignee` 时，CLI 会自动采用“两段式创建”：先建项目，再补一次 update。这是为了兼容部分 Plane 实例的后端校验差异。
- `project features set`、`issue attachments upload` 这类命令在真实实例上可能会遇到几秒钟的读副本延迟。写入成功后如果立刻回读不到，稍后再查一次通常即可。
- 当前不提供危险删除命令，也不主动清理服务端 token。

## 已验证命令

在真实 Plane 实例上已验证：

- `me`
- `workspace current/ls/use`
- `project ls/get/summary/create/update`
- `project members workspace/ls/add`
- `project features get/set/enable-all`
- `issue ls/get/key/search/create/update`
- `issue labels ls/create`
- `issue comments ls/add/update`
- `issue activities ls`
- `issue links ls/add/update`
- `issue relations ls/add`
- `issue attachments ls/upload`

## 发布

当前包名使用 `@ysicing/plane-cli`，因为 `plane-cli` 已被 npm 占用。

发布前检查：

```bash
npm test
npm run pack:check
```

发布：

```bash
npm publish
```

如果本机还没登录 npm：

```bash
npm login
```
