import { IssueClient } from "../api/issue-client.js";
import { ProjectClient } from "../api/project-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { ensureValue, parseCommandArgs, pickDefined, splitCsv } from "../core/options.js";
import { printData, printTable } from "../core/output.js";
import { basename, extname } from "node:path";
import { readFile, stat } from "node:fs/promises";

function renderIssueList(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id },
    { label: "Seq", get: (row) => row.sequence_id || "" },
    { label: "Name", get: (row) => row.name },
    { label: "Priority", get: (row) => row.priority || "" },
    { label: "State", get: (row) => row.state || row.state_id || "" },
  ]);
}

function renderIssueSearch(data) {
  const rows = Array.isArray(data?.issues) ? data.issues : Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id },
    { label: "Key", get: (row) => `${row.project__identifier || row.project_identifier || ""}-${row.sequence_id || ""}` },
    { label: "Project", get: (row) => row.project__identifier || row.project_identifier || "" },
    { label: "Name", get: (row) => row.name || "" },
  ]);
}

function renderIssueLabels(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Name", get: (row) => row.name || "" },
    { label: "Color", get: (row) => row.color || "" },
    { label: "Description", get: (row) => row.description || "" },
  ]);
}

function renderIssueComments(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Actor", get: (row) => row.actor || "" },
    { label: "Created", get: (row) => row.created_at || "" },
    { label: "Comment", get: (row) => String(row.comment_html || "").replace(/\s+/g, " ").trim() },
  ]);
}

function renderIssueActivities(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Field", get: (row) => row.field || "" },
    { label: "Actor", get: (row) => row.actor || "" },
    { label: "Created", get: (row) => row.created_at || "" },
  ]);
}

function renderIssueLinks(data) {
  const rows = Array.isArray(data) ? data : data.results || [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Title", get: (row) => row.title || "" },
    { label: "URL", get: (row) => row.url || "" },
  ]);
}

function renderIssueRelations(data) {
  const rows = Object.entries(data || {}).flatMap(([relationType, ids]) =>
    Array.isArray(ids) ? ids.map((id) => ({ relationType, id })) : []
  );
  printTable(rows, [
    { label: "Relation", get: (row) => row.relationType },
    { label: "Issue ID", get: (row) => row.id },
  ]);
}

function renderIssueAttachments(data) {
  const rows = Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "ID", get: (row) => row.id || "" },
    { label: "Name", get: (row) => row.attributes?.name || "" },
    { label: "Type", get: (row) => row.attributes?.type || "" },
    { label: "Size", get: (row) => row.attributes?.size || row.size || "" },
    { label: "Uploaded", get: (row) => (row.is_uploaded ? "yes" : "no") },
  ]);
}

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".rtf": "application/rtf",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".odg": "application/vnd.oasis.opendocument.graphics",
  ".vsd": "application/vnd.visio",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".m4a": "audio/x-m4a",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".7z": "application/x-7z-compressed",
};

export function parseIssueKey(value) {
  const trimmed = String(value || "").trim();
  const match = /^([A-Za-z0-9_]+)-(\d+)$/.exec(trimmed);

  if (!match) {
    throw new CliError("Issue key must look like `PROJECT-123`.");
  }

  return {
    projectIdentifier: match[1],
    issueIdentifier: match[2],
  };
}

function isIssueKey(value) {
  return /^([A-Za-z0-9_]+)-(\d+)$/.test(String(value || "").trim());
}

async function resolveIssueTarget(issueClient, projectId, issueRef) {
  ensureValue(issueRef, "Issue ID is required.");

  if (projectId) {
    return {
      projectId,
      issueId: issueRef,
    };
  }

  if (!isIssueKey(issueRef)) {
    throw new CliError("Project ID is required unless the issue is provided as a key like `GAEA-25`.");
  }

  const { projectIdentifier, issueIdentifier } = parseIssueKey(issueRef);
  const issue = await issueClient.getByKey(projectIdentifier, issueIdentifier);

  return {
    projectId: issue.project,
    issueId: issue.id,
  };
}

export function buildIssuePayload(values) {
  return pickDefined({
    name: values.name,
    description_html: values["description-html"],
    state: values.state,
    priority: values.priority,
    start_date: values["start-date"],
    target_date: values["target-date"],
    parent: values.parent,
    type_id: values["type-id"],
    assignees: splitCsv(values.assignees),
    labels: splitCsv(values.labels),
  });
}

export function buildIssueLabelPayload(values) {
  return pickDefined({
    name: values.name,
    color: values.color,
    description: values.description,
    parent: values.parent,
    sort_order: values["sort-order"],
  });
}

export function buildIssueCommentPayload(values) {
  return pickDefined({
    comment_html: values.html,
    access: values.access,
  });
}

export function buildIssueLinkPayload(values, issueId) {
  return pickDefined({
    title: values.title,
    url: values.url,
    issue_id: issueId,
  });
}

export function buildIssueRelationPayload(values) {
  return pickDefined({
    relation_type: values["relation-type"],
    issues: splitCsv(values.issues),
  });
}

export function inferAttachmentMimeType(filePath) {
  return MIME_BY_EXTENSION[extname(filePath).toLowerCase()] || null;
}

export function resolveAssigneeRefs(refs, members) {
  const resolved = [];

  for (const ref of refs) {
    const value = String(ref).trim();
    const lowered = value.toLowerCase();
    const match = members.find((member) => {
      const memberId = String(member.id || "");
      const email = String(member.email || "").toLowerCase();
      const displayName = `${member.first_name || ""} ${member.last_name || ""}`.trim().toLowerCase();
      return memberId === value || email === lowered || (displayName && displayName === lowered);
    });

    if (!match) {
      throw new CliError(`Assignee not found in workspace members: ${value}`, {
        details: {
          hint: "Use `plane project members workspace` to inspect available members.",
        },
      });
    }

    resolved.push(String(match.id));
  }

  return resolved;
}

function printHelp() {
  console.log(`Usage:
  plane issue ls --project <project-id> [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--state <state-id>] [--priority <value>] [--assignees <id1,id2>] [--expand <field1,field2>]
  plane issue get --project <project-id> <issue-id>
  plane issue get GAEA-25
  plane issue key <PROJECT-123> [--expand <field1,field2>] [--fields <field1,field2>]
  plane issue search --query <text> [--project <project-id>] [--limit <n>] [--workspace-search]
  plane issue labels ls --project <project-id>
  plane issue labels create --project <project-id> --name <name> [--color <hex>] [--description <text>] [--parent <label-id>] [--sort-order <n>]
  plane issue comments ls --project <project-id> <issue-id>
  plane issue comments ls GAEA-25
  plane issue comments add --project <project-id> <issue-id> --html '<p>comment</p>' [--access <value>]
  plane issue comments add GAEA-25 --html '<p>comment</p>' [--access <value>]
  plane issue comments update --project <project-id> <issue-id> <comment-id> --html '<p>comment</p>' [--access <value>]
  plane issue comments update GAEA-25 <comment-id> --html '<p>comment</p>' [--access <value>]
  plane issue activities ls --project <project-id> <issue-id>
  plane issue activities ls GAEA-25
  plane issue links ls --project <project-id> <issue-id>
  plane issue links ls GAEA-25
  plane issue links add --project <project-id> <issue-id> --url <url> [--title <text>]
  plane issue links add GAEA-25 --url <url> [--title <text>]
  plane issue links update --project <project-id> <issue-id> <link-id> --url <url> [--title <text>]
  plane issue links update GAEA-25 <link-id> --url <url> [--title <text>]
  plane issue relations ls --project <project-id> <issue-id>
  plane issue relations ls GAEA-25
  plane issue relations add --project <project-id> <issue-id> --relation-type <blocking|blocked_by|duplicate|relates_to|start_before|start_after|finish_before|finish_after> --issues <id1,id2>
  plane issue relations add GAEA-25 --relation-type <blocking|blocked_by|duplicate|relates_to|start_before|start_after|finish_before|finish_after> --issues <id1,id2>
  plane issue attachments ls --project <project-id> <issue-id>
  plane issue attachments ls GAEA-25
  plane issue attachments upload --project <project-id> <issue-id> --file <path> [--name <filename>] [--type <mime>]
  plane issue attachments upload GAEA-25 --file <path> [--name <filename>] [--type <mime>]
  plane issue create --project <project-id> --name <name> [--description-html <html>] [--state <state-id>] [--priority <value>] [--assignees <id-or-email1,id-or-email2>] [--labels <id1,id2>]
  plane issue update --project <project-id> <issue-id> [--name <name>] [--description-html <html>] [--state <state-id>] [--priority <value>] [--assignees <id-or-email1,id-or-email2>] [--labels <id1,id2>]
`);
}

async function runIssueLabelsCommand(issueClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        limit: { type: "string" },
        cursor: { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.project, "Project ID is required.");
    const result = await issueClient.listLabels(
      parsed.values.project,
      pickDefined({
        per_page: parsed.values.limit,
        cursor: parsed.values.cursor,
      })
    );

    printData(result, {
      ...context.output,
      render: renderIssueLabels,
    });
    return;
  }

  if (subcommand === "create") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        name: { type: "string" },
        color: { type: "string" },
        description: { type: "string" },
        parent: { type: "string" },
        "sort-order": { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.values.name, "Label name is required.");
    const result = await issueClient.createLabel(parsed.values.project, buildIssueLabelPayload(parsed.values));
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown issue labels subcommand: ${subcommand}`);
}

async function runIssueCommentsCommand(issueClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        limit: { type: "string" },
        cursor: { type: "string" },
        "order-by": { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.listComments(
      issueRef.projectId,
      issueRef.issueId,
      pickDefined({
        per_page: parsed.values.limit,
        cursor: parsed.values.cursor,
        order_by: parsed.values["order-by"],
      })
    );
    printData(result, {
      ...context.output,
      render: renderIssueComments,
    });
    return;
  }

  if (subcommand === "add") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        html: { type: "string" },
        access: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    ensureValue(parsed.values.html, "Comment HTML is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.createComment(
      issueRef.projectId,
      issueRef.issueId,
      buildIssueCommentPayload(parsed.values)
    );
    printData(result, context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        html: { type: "string" },
        access: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    ensureValue(parsed.positionals[1], "Comment ID is required.");
    ensureValue(parsed.values.html, "Comment HTML is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.updateComment(
      issueRef.projectId,
      issueRef.issueId,
      parsed.positionals[1],
      buildIssueCommentPayload(parsed.values)
    );
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown issue comments subcommand: ${subcommand}`);
}

async function runIssueActivitiesCommand(issueClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand !== "ls") {
    throw new CliError(`Unknown issue activities subcommand: ${subcommand}`);
  }

  const parsed = parseCommandArgs(
    rest,
    {
      project: { type: "string" },
      limit: { type: "string" },
      cursor: { type: "string" },
      "order-by": { type: "string" },
    }
  );

  ensureValue(parsed.positionals[0], "Issue ID is required.");
  const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
  const result = await issueClient.listActivities(
    issueRef.projectId,
    issueRef.issueId,
    pickDefined({
      per_page: parsed.values.limit,
      cursor: parsed.values.cursor,
      order_by: parsed.values["order-by"],
    })
  );
  printData(result, {
    ...context.output,
    render: renderIssueActivities,
  });
}

async function runIssueLinksCommand(issueClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.listLinks(issueRef.projectId, issueRef.issueId);
    printData(result, {
      ...context.output,
      render: renderIssueLinks,
    });
    return;
  }

  if (subcommand === "add") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        url: { type: "string" },
        title: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    ensureValue(parsed.values.url, "Link URL is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.createLink(
      issueRef.projectId,
      issueRef.issueId,
      buildIssueLinkPayload(parsed.values, issueRef.issueId)
    );
    printData(result, context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        url: { type: "string" },
        title: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    ensureValue(parsed.positionals[1], "Link ID is required.");
    ensureValue(parsed.values.url, "Link URL is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.updateLink(
      issueRef.projectId,
      issueRef.issueId,
      parsed.positionals[1],
      buildIssueLinkPayload(parsed.values, issueRef.issueId)
    );
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown issue links subcommand: ${subcommand}`);
}

async function runIssueRelationsCommand(issueClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.listRelations(issueRef.projectId, issueRef.issueId);
    printData(result, {
      ...context.output,
      render: renderIssueRelations,
    });
    return;
  }

  if (subcommand === "add") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        "relation-type": { type: "string" },
        issues: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    ensureValue(parsed.values["relation-type"], "Relation type is required.");
    ensureValue(parsed.values.issues, "At least one related issue ID is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.createRelation(
      issueRef.projectId,
      issueRef.issueId,
      buildIssueRelationPayload(parsed.values)
    );
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown issue relations subcommand: ${subcommand}`);
}

async function uploadAttachmentBinary(uploadData, filePath, fileName, mimeType) {
  const buffer = await readFile(filePath);
  const form = new FormData();

  for (const [key, value] of Object.entries(uploadData.fields || {})) {
    form.append(key, value);
  }

  form.append("file", new Blob([buffer], { type: mimeType }), fileName);

  const response = await fetch(uploadData.url, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new CliError(`Attachment upload failed: ${response.status} ${response.statusText}`);
  }
}

async function runIssueAttachmentsCommand(issueClient, args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.listAttachments(issueRef.projectId, issueRef.issueId);
    printData(result, {
      ...context.output,
      render: renderIssueAttachments,
    });
    return;
  }

  if (subcommand === "upload") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        file: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    ensureValue(parsed.values.file, "File path is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);

    const filePath = parsed.values.file;
    const fileInfo = await stat(filePath);
    const fileName = parsed.values.name || basename(filePath);
    const mimeType = parsed.values.type || inferAttachmentMimeType(filePath);

    if (!mimeType) {
      throw new CliError("Could not infer attachment MIME type. Pass --type explicitly.");
    }

    const uploadSession = await issueClient.createAttachmentUpload(issueRef.projectId, issueRef.issueId, {
      name: fileName,
      type: mimeType,
      size: fileInfo.size,
    });

    await uploadAttachmentBinary(uploadSession.upload_data, filePath, fileName, mimeType);
    await issueClient.confirmAttachmentUpload(issueRef.projectId, issueRef.issueId, uploadSession.asset_id);

    printData(
      {
        assetId: uploadSession.asset_id,
        assetUrl: uploadSession.asset_url,
        attachment: uploadSession.attachment,
        uploaded: true,
      },
      context.output
    );
    return;
  }

  throw new CliError(`Unknown issue attachments subcommand: ${subcommand}`);
}

export async function runIssueCommand(args, context) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "help") {
    printHelp();
    return;
  }

  const config = await resolveRuntimeConfig();
  const planeClient = new PlaneClient(config);
  const issueClient = new IssueClient(planeClient);
  const projectClient = new ProjectClient(planeClient);

  if (subcommand === "labels") {
    await runIssueLabelsCommand(issueClient, rest, context);
    return;
  }

  if (subcommand === "comments") {
    await runIssueCommentsCommand(issueClient, rest, context);
    return;
  }

  if (subcommand === "activities") {
    await runIssueActivitiesCommand(issueClient, rest, context);
    return;
  }

  if (subcommand === "links") {
    await runIssueLinksCommand(issueClient, rest, context);
    return;
  }

  if (subcommand === "relations") {
    await runIssueRelationsCommand(issueClient, rest, context);
    return;
  }

  if (subcommand === "attachments") {
    await runIssueAttachmentsCommand(issueClient, rest, context);
    return;
  }

  if (subcommand === "ls") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        limit: { type: "string" },
        cursor: { type: "string" },
        "order-by": { type: "string" },
        state: { type: "string" },
        priority: { type: "string" },
        assignees: { type: "string" },
        labels: { type: "string" },
        expand: { type: "string" },
        fields: { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.project, "Project ID is required.");

    const result = await issueClient.list(
      parsed.values.project,
      pickDefined({
        per_page: parsed.values.limit,
        cursor: parsed.values.cursor,
        order_by: parsed.values["order-by"],
        state: parsed.values.state,
        priority: parsed.values.priority,
        assignees: parsed.values.assignees,
        labels: parsed.values.labels,
        expand: parsed.values.expand,
        fields: parsed.values.fields,
      })
    );

    printData(result, {
      ...context.output,
      render: renderIssueList,
    });
    return;
  }

  if (subcommand === "get") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue ID is required.");
    const issueRef = await resolveIssueTarget(issueClient, parsed.values.project, parsed.positionals[0]);
    const result = await issueClient.get(issueRef.projectId, issueRef.issueId);
    printData(result, context.output);
    return;
  }

  if (subcommand === "key") {
    const parsed = parseCommandArgs(
      rest,
      {
        expand: { type: "string" },
        fields: { type: "string" },
      }
    );

    ensureValue(parsed.positionals[0], "Issue key is required.");
    const { projectIdentifier, issueIdentifier } = parseIssueKey(parsed.positionals[0]);
    const result = await issueClient.getByKey(
      projectIdentifier,
      issueIdentifier,
      pickDefined({
        expand: parsed.values.expand,
        fields: parsed.values.fields,
      })
    );
    printData(result, context.output);
    return;
  }

  if (subcommand === "search") {
    const parsed = parseCommandArgs(
      rest,
      {
        query: { type: "string" },
        project: { type: "string" },
        limit: { type: "string" },
        "workspace-search": { type: "boolean" },
      },
      false
    );

    ensureValue(parsed.values.query, "Search query is required.");

    const result = await issueClient.search(
      pickDefined({
        search: parsed.values.query,
        project_id: parsed.values.project,
        limit: parsed.values.limit,
        workspace_search: parsed.values["workspace-search"] ? "true" : parsed.values.project ? "false" : "true",
      })
    );

    printData(result, {
      ...context.output,
      render: renderIssueSearch,
    });
    return;
  }

  if (subcommand === "create") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        name: { type: "string" },
        "description-html": { type: "string" },
        state: { type: "string" },
        priority: { type: "string" },
        assignees: { type: "string" },
        labels: { type: "string" },
        "start-date": { type: "string" },
        "target-date": { type: "string" },
        parent: { type: "string" },
        "type-id": { type: "string" },
      },
      false
    );

    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.values.name, "Issue name is required.");

    const payload = buildIssuePayload(parsed.values);
    if (payload.assignees) {
      const members = await projectClient.listWorkspaceMembers();
      payload.assignees = resolveAssigneeRefs(payload.assignees, members);
    }

    const result = await issueClient.create(parsed.values.project, payload);
    printData(result, context.output);
    return;
  }

  if (subcommand === "update") {
    const parsed = parseCommandArgs(
      rest,
      {
        project: { type: "string" },
        name: { type: "string" },
        "description-html": { type: "string" },
        state: { type: "string" },
        priority: { type: "string" },
        assignees: { type: "string" },
        labels: { type: "string" },
        "start-date": { type: "string" },
        "target-date": { type: "string" },
        parent: { type: "string" },
        "type-id": { type: "string" },
      }
    );

    ensureValue(parsed.values.project, "Project ID is required.");
    ensureValue(parsed.positionals[0], "Issue ID is required.");

    const payload = buildIssuePayload(parsed.values);
    if (Object.keys(payload).length === 0) {
      throw new CliError("At least one update field is required.");
    }

    if (payload.assignees) {
      const members = await projectClient.listWorkspaceMembers();
      payload.assignees = resolveAssigneeRefs(payload.assignees, members);
    }

    const result = await issueClient.update(parsed.values.project, parsed.positionals[0], payload);
    printData(result, context.output);
    return;
  }

  throw new CliError(`Unknown issue subcommand: ${subcommand}`);
}
