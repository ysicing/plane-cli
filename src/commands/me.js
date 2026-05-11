import { IssueClient } from "../api/issue-client.js";
import { ProjectClient } from "../api/project-client.js";
import { UserClient } from "../api/user-client.js";
import { resolveRuntimeConfig } from "../core/config.js";
import { CliError } from "../core/errors.js";
import { PlaneClient } from "../core/http.js";
import { parseCommandArgs, pickDefined } from "../core/options.js";
import { printData, printTable } from "../core/output.js";

function renderMyProjectStats(data) {
  const rows = Array.isArray(data) ? data : [];
  printTable(rows, [
    { label: "Project", get: (row) => row.project_identifier || "" },
    { label: "Name", get: (row) => row.project_name || "" },
    { label: "Total", get: (row) => row.total ?? "" },
    { label: "Assigned", get: (row) => row.assigned_total ?? "" },
    { label: "Pending", get: (row) => row.pending_total ?? "" },
    { label: "Completed", get: (row) => row.completed_total ?? "" },
    { label: "Overdue", get: (row) => row.overdue_total ?? "" },
  ]);
}

function rowsFromPage(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function isApiNotFound(error) {
  return error instanceof CliError && /404 Not Found/.test(error.message);
}

function isApiForbidden(error) {
  return error instanceof CliError && /403 Forbidden/.test(error.message);
}

export function isTodoWorkItem(item) {
  const stateGroup = typeof item.state === "object" ? item.state?.group : item.state_group;
  return !item.completed_at && !["completed", "cancelled"].includes(stateGroup);
}

export function buildMyWorkItemQuery(values) {
  return pickDefined({
    per_page: values.limit,
    cursor: values.cursor,
    order_by: values["order-by"],
    fields: values.fields,
    expand: values.expand,
    project_id: values.project,
    state_group: values["state-group"],
    type_id: values["type-id"],
    issue_type_id: values["issue-type-id"],
    module_id: values["module-id"],
    cycle_id: values["cycle-id"],
    created_from: values["created-from"],
    created_to: values["created-to"],
    updated_from: values["updated-from"],
    updated_to: values["updated-to"],
    completed_from: values["completed-from"],
    completed_to: values["completed-to"],
    target_from: values["target-from"],
    target_to: values["target-to"],
  });
}

function countBy(items, getKey) {
  const counts = {};

  for (const item of items) {
    const key = getKey(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

function startOfLocalDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatLocalWindow(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absMinutes / 60));
  const offsetRemainder = pad(absMinutes % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}${sign}${offsetHours}:${offsetRemainder}`;
}

export function buildMeSummary(workItems, projectStats, now = new Date()) {
  const todayStart = startOfLocalDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);

  const weekStart = new Date(todayStart);
  const day = weekStart.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - mondayOffset);

  const isWithinWindow = (value, start, end) => {
    if (!value) return false;
    const date = new Date(value);
    return date >= start && date <= end;
  };

  const totalStats = projectStats.reduce(
    (acc, item) => {
      acc.total += item.total || 0;
      acc.assigned_total += item.assigned_total || 0;
      acc.pending_total += item.pending_total || 0;
      acc.completed_total += item.completed_total || 0;
      acc.cancelled_total += item.cancelled_total || 0;
      acc.overdue_total += item.overdue_total || 0;
      return acc;
    },
    {
      total: 0,
      assigned_total: 0,
      pending_total: 0,
      completed_total: 0,
      cancelled_total: 0,
      overdue_total: 0,
    }
  );

  return {
    generated_at: now.toISOString(),
    windows: {
      today: {
        from: formatLocalWindow(todayStart),
        to: formatLocalWindow(todayEnd),
      },
      this_week: {
        from: formatLocalWindow(weekStart),
        to: formatLocalWindow(todayEnd),
      },
    },
    my_work_items: {
      all: workItems.length,
      updated_today: workItems.filter((item) => isWithinWindow(item.updated_at, todayStart, todayEnd)).length,
      updated_this_week: workItems.filter((item) => isWithinWindow(item.updated_at, weekStart, todayEnd)).length,
      completed_this_week: workItems.filter((item) => isWithinWindow(item.completed_at, weekStart, todayEnd)).length,
      by_priority: countBy(workItems, (item) => item.priority),
      by_state: countBy(workItems, (item) => item.state),
    },
    accessible_work_items: {
      project_count: projectStats.length,
      totals: totalStats,
      projects: projectStats,
    },
  };
}

export function aggregateWorkspaceSummaries(workspaceSummaries, now = new Date()) {
  const aggregate = {
    generated_at: now.toISOString(),
    mode: "all-workspaces",
    workspace_count: workspaceSummaries.length,
    workspaces: workspaceSummaries,
    my_work_items: {
      all: 0,
      updated_today: 0,
      updated_this_week: 0,
      completed_this_week: 0,
      by_priority: {},
      by_state: {},
    },
    accessible_work_items: {
      project_count: 0,
      totals: {
        total: 0,
        assigned_total: 0,
        pending_total: 0,
        completed_total: 0,
        cancelled_total: 0,
        overdue_total: 0,
      },
      projects: [],
    },
  };

  const addCounts = (target, source = {}) => {
    for (const [key, value] of Object.entries(source)) {
      target[key] = (target[key] || 0) + value;
    }
  };

  for (const item of workspaceSummaries) {
    const summary = item.summary;
    aggregate.my_work_items.all += summary.my_work_items.all;
    aggregate.my_work_items.updated_today += summary.my_work_items.updated_today;
    aggregate.my_work_items.updated_this_week += summary.my_work_items.updated_this_week;
    aggregate.my_work_items.completed_this_week += summary.my_work_items.completed_this_week;
    addCounts(aggregate.my_work_items.by_priority, summary.my_work_items.by_priority);
    addCounts(aggregate.my_work_items.by_state, summary.my_work_items.by_state);

    aggregate.accessible_work_items.project_count += summary.accessible_work_items.project_count;
    aggregate.accessible_work_items.totals.total += summary.accessible_work_items.totals.total;
    aggregate.accessible_work_items.totals.assigned_total += summary.accessible_work_items.totals.assigned_total;
    aggregate.accessible_work_items.totals.pending_total += summary.accessible_work_items.totals.pending_total;
    aggregate.accessible_work_items.totals.completed_total += summary.accessible_work_items.totals.completed_total;
    aggregate.accessible_work_items.totals.cancelled_total += summary.accessible_work_items.totals.cancelled_total;
    aggregate.accessible_work_items.totals.overdue_total += summary.accessible_work_items.totals.overdue_total;
    aggregate.accessible_work_items.projects.push(
      ...summary.accessible_work_items.projects.map((project) => ({
        workspace: item.workspace,
        ...project,
      }))
    );
  }

  return aggregate;
}

function renderMeSummary(summary) {
  printData(
    {
      generated_at: summary.generated_at,
      today_window: `${summary.windows.today.from} -> ${summary.windows.today.to}`,
      this_week_window: `${summary.windows.this_week.from} -> ${summary.windows.this_week.to}`,
      my_all: summary.my_work_items.all,
      my_updated_today: summary.my_work_items.updated_today,
      my_updated_this_week: summary.my_work_items.updated_this_week,
      my_completed_this_week: summary.my_work_items.completed_this_week,
      accessible_projects: summary.accessible_work_items.project_count,
      accessible_total: summary.accessible_work_items.totals.total,
      accessible_assigned: summary.accessible_work_items.totals.assigned_total,
      accessible_pending: summary.accessible_work_items.totals.pending_total,
      accessible_completed: summary.accessible_work_items.totals.completed_total,
      accessible_cancelled: summary.accessible_work_items.totals.cancelled_total,
      accessible_overdue: summary.accessible_work_items.totals.overdue_total,
    },
    {}
  );

  const priorityRows = Object.entries(summary.my_work_items.by_priority).map(([priority, count]) => ({ priority, count }));
  if (priorityRows.length > 0) {
    console.log("");
    printTable(priorityRows, [
      { label: "Priority", get: (row) => row.priority },
      { label: "Count", get: (row) => row.count },
    ]);
  }

  if (summary.accessible_work_items.projects.length > 0) {
    console.log("");
    renderMyProjectStats(summary.accessible_work_items.projects);
  }
}

function renderAllWorkspaceSummary(summary) {
  printData(
    {
      generated_at: summary.generated_at,
      workspace_count: summary.workspace_count,
      my_all: summary.my_work_items.all,
      my_updated_today: summary.my_work_items.updated_today,
      my_updated_this_week: summary.my_work_items.updated_this_week,
      my_completed_this_week: summary.my_work_items.completed_this_week,
      accessible_projects: summary.accessible_work_items.project_count,
      accessible_total: summary.accessible_work_items.totals.total,
      accessible_assigned: summary.accessible_work_items.totals.assigned_total,
      accessible_pending: summary.accessible_work_items.totals.pending_total,
      accessible_completed: summary.accessible_work_items.totals.completed_total,
      accessible_cancelled: summary.accessible_work_items.totals.cancelled_total,
      accessible_overdue: summary.accessible_work_items.totals.overdue_total,
    },
    {}
  );

  if (summary.workspaces.length > 0) {
    console.log("");
    printTable(
      summary.workspaces.map((item) => ({
        workspace: item.workspace,
        my_all: item.summary.my_work_items.all,
        my_updated_today: item.summary.my_work_items.updated_today,
        my_updated_this_week: item.summary.my_work_items.updated_this_week,
        accessible_total: item.summary.accessible_work_items.totals.total,
        accessible_assigned: item.summary.accessible_work_items.totals.assigned_total,
      })),
      [
        { label: "Workspace", get: (row) => row.workspace },
        { label: "My All", get: (row) => row.my_all },
        { label: "Today", get: (row) => row.my_updated_today },
        { label: "This Week", get: (row) => row.my_updated_this_week },
        { label: "Total", get: (row) => row.accessible_total },
        { label: "Assigned", get: (row) => row.accessible_assigned },
      ]
    );
  }
}

async function listAccessibleProjects(projectClient, projectId) {
  if (projectId) {
    return [{ id: projectId }];
  }

  const projects = [];
  let cursor;

  while (true) {
    const page = await projectClient.list(
      pickDefined({
        per_page: 100,
        cursor,
      })
    );

    projects.push(...rowsFromPage(page));

    if (!page.next_page_results || !page.next_cursor) {
      break;
    }

    cursor = page.next_cursor;
  }

  return projects;
}

function filterAssignedWorkItems(items, userId, todoOnly) {
  return items.filter((item) => {
    const assignees = Array.isArray(item.assignees) ? item.assignees.map(String) : [];
    return assignees.includes(String(userId)) && (!todoOnly || isTodoWorkItem(item));
  });
}

function fallbackPage(results) {
  return {
    grouped_by: null,
    sub_grouped_by: null,
    total_count: results.length,
    next_cursor: null,
    prev_cursor: null,
    next_page_results: false,
    prev_page_results: false,
    count: results.length,
    total_pages: 1,
    total_results: results.length,
    extra_stats: null,
    results,
    fallback: "project-work-items",
  };
}

function workItemStateGroup(item) {
  return typeof item.state === "object" ? item.state?.group : item.state_group;
}

async function listProjectWorkItems(issueClient, projectId, options = {}) {
  const results = [];
  let cursor;

  while (true) {
    let page;
    try {
      page = await issueClient.list(
        projectId,
        pickDefined({
          per_page: 200,
          cursor,
        })
      );
    } catch (error) {
      if (options.skipForbidden && isApiForbidden(error)) {
        return null;
      }
      throw error;
    }

    results.push(...rowsFromPage(page));

    if (!page.next_page_results || !page.next_cursor) {
      break;
    }

    cursor = page.next_cursor;
  }

  return results;
}

async function listMyWorkItemsFromProjects(issueClient, projectClient, userClient, query, todoOnly) {
  const user = await userClient.me();
  const projects = await listAccessibleProjects(projectClient, query.project_id);
  const maxResults = Number.parseInt(query.per_page || "50", 10);
  const results = [];

  for (const project of projects) {
    let cursor;

    while (results.length < maxResults) {
      let page;
      try {
        page = await issueClient.list(
          project.id,
          pickDefined({
            per_page: Math.min(100, Math.max(maxResults * 2, 20)),
            cursor,
            order_by: query.order_by,
            fields: query.fields,
            expand: query.expand,
          })
        );
      } catch (error) {
        if (!query.project_id && isApiForbidden(error)) {
          break;
        }
        throw error;
      }

      results.push(...filterAssignedWorkItems(rowsFromPage(page), user.id, todoOnly));

      if (!page.next_page_results || !page.next_cursor) {
        break;
      }

      cursor = page.next_cursor;
    }

    if (results.length >= maxResults) {
      break;
    }
  }

  return fallbackPage(results.slice(0, maxResults));
}

export async function listMyWorkItemsWithFallback(issueClient, projectClient, userClient, query, options = {}) {
  const todoOnly = Boolean(options.todoOnly);

  try {
    const page = await issueClient.listMyWorkItems(query);
    if (!todoOnly) {
      return page;
    }
    return {
      ...page,
      results: rowsFromPage(page).filter(isTodoWorkItem),
    };
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }
    return listMyWorkItemsFromProjects(issueClient, projectClient, userClient, query, todoOnly);
  }
}

export async function listMyProjectStatsWithFallback(issueClient, projectClient, userClient, query) {
  try {
    return await issueClient.listMyProjectWorkItemStats(query);
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }
  }

  const user = await userClient.me();
  const projects = await listAccessibleProjects(projectClient, query.project_id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = [];
  for (const project of projects) {
    const items = await listProjectWorkItems(issueClient, project.id, { skipForbidden: !query.project_id });
    if (!items) {
      continue;
    }
    const isPending = (item) => !item.completed_at && workItemStateGroup(item) !== "cancelled";
    const assignedItems = items.filter((item) =>
      (Array.isArray(item.assignees) ? item.assignees.map(String) : []).includes(String(user.id))
    );

    stats.push({
      project_id: project.id,
      project_identifier: project.identifier || "",
      project_name: project.name || "",
      total: items.length,
      assigned_total: assignedItems.length,
      completed_total: items.filter((item) => item.completed_at || workItemStateGroup(item) === "completed").length,
      pending_total: items.filter(isPending).length,
      cancelled_total: items.filter((item) => workItemStateGroup(item) === "cancelled").length,
      overdue_total: items.filter((item) => {
        if (!item.target_date || !isPending(item)) return false;
        return new Date(`${item.target_date}T00:00:00`) < today;
      }).length,
      fallback: "project-work-items",
    });
  }

  return stats;
}

async function listAllMyWorkItems(issueClient, projectClient, userClient) {
  const results = [];
  let cursor;

  while (true) {
    const page = await listMyWorkItemsWithFallback(
      issueClient,
      projectClient,
      userClient,
      pickDefined({
        per_page: 200,
        cursor,
      })
    );

    results.push(...(Array.isArray(page.results) ? page.results : []));

    if (!page.next_page_results || !page.next_cursor) {
      break;
    }

    cursor = page.next_cursor;
  }

  return results;
}

async function buildWorkspaceSummary(config, workspace, now = new Date()) {
  const planeClient = new PlaneClient({
    ...config,
    workspace,
  });
  const issueClient = new IssueClient(planeClient);
  const projectClient = new ProjectClient(planeClient);
  const userClient = new UserClient(planeClient);
  const workItems = await listAllMyWorkItems(issueClient, projectClient, userClient);
  const projectStats = await listMyProjectStatsWithFallback(issueClient, projectClient, userClient, {});
  return buildMeSummary(workItems, projectStats, now);
}

function printHelp() {
  console.log(`Usage:
  plane me
  plane me summary [--all-ws]
  plane me work-items [--project <project-id>] [--state-group <group>] [--type-id <type-id>] [--issue-type-id <type-id>] [--module-id <module-id>] [--cycle-id <cycle-id>] [--created-from <datetime>] [--created-to <datetime>] [--updated-from <datetime>] [--updated-to <datetime>] [--completed-from <datetime>] [--completed-to <datetime>] [--target-from <date>] [--target-to <date>] [--limit <n>] [--cursor <cursor>] [--order-by <field>] [--fields <fields>] [--expand <fields>]
  plane me project-stats [--project <project-id>] [--state-group <group>] [--type-id <type-id>] [--issue-type-id <type-id>] [--module-id <module-id>] [--cycle-id <cycle-id>] [--created-from <datetime>] [--created-to <datetime>] [--updated-from <datetime>] [--updated-to <datetime>] [--completed-from <datetime>] [--completed-to <datetime>] [--target-from <date>] [--target-to <date>]
`);
}

export function parseMyWorkItemArgs(args, includePagination) {
  const parsed = parseCommandArgs(
    args,
    {
      project: { type: "string" },
      "state-group": { type: "string" },
      "type-id": { type: "string" },
      "issue-type-id": { type: "string" },
      "module-id": { type: "string" },
      "cycle-id": { type: "string" },
      "created-from": { type: "string" },
      "created-to": { type: "string" },
      "updated-from": { type: "string" },
      "updated-to": { type: "string" },
      "completed-from": { type: "string" },
      "completed-to": { type: "string" },
      "target-from": { type: "string" },
      "target-to": { type: "string" },
      limit: { type: "string" },
      cursor: { type: "string" },
      "order-by": { type: "string" },
      fields: { type: "string" },
      expand: { type: "string" },
    },
    false
  );

  const query = buildMyWorkItemQuery(parsed.values);
  if (!includePagination) {
    delete query.per_page;
    delete query.cursor;
    delete query.order_by;
    delete query.fields;
    delete query.expand;
  }
  return query;
}

export async function runMeCommand(args, context) {
  if (args.includes("--help") || args.includes("-h") || args.includes("help")) {
    printHelp();
    return;
  }

  const config = await resolveRuntimeConfig();
  const planeClient = new PlaneClient(config);
  const [subcommand, ...rest] = args;
  const userClient = new UserClient(planeClient);

  if (!subcommand) {
    printData(await userClient.me(), context.output);
    return;
  }

  const issueClient = new IssueClient(planeClient);
  const projectClient = new ProjectClient(planeClient);

  if (subcommand === "work-items") {
    const result = await listMyWorkItemsWithFallback(
      issueClient,
      projectClient,
      userClient,
      parseMyWorkItemArgs(rest, true)
    );
    printData(result, context.output);
    return;
  }

  if (subcommand === "project-stats") {
    const result = await listMyProjectStatsWithFallback(
      issueClient,
      projectClient,
      userClient,
      parseMyWorkItemArgs(rest, false)
    );
    printData(result, {
      ...context.output,
      render: renderMyProjectStats,
    });
    return;
  }

  if (subcommand === "summary") {
    const parsed = parseCommandArgs(
      rest,
      {
        "all-ws": { type: "boolean" },
      },
      false
    );

    if (parsed.values["all-ws"]) {
      const workspaces = Array.isArray(config.knownWorkspaces) ? config.knownWorkspaces : [];
      if (workspaces.length === 0) {
        throw new CliError("No known workspaces found. Run `plane workspace ls` first.");
      }

      const now = new Date();
      const summaries = [];
      for (const workspace of workspaces) {
        summaries.push({
          workspace,
          summary: await buildWorkspaceSummary(config, workspace, now),
        });
      }

      const aggregate = aggregateWorkspaceSummaries(summaries, now);
      if (context.output.format === "json") {
        printData(aggregate, context.output);
        return;
      }
      renderAllWorkspaceSummary(aggregate);
      return;
    }

    const summary = await buildWorkspaceSummary(config, config.workspace, new Date());
    if (context.output.format === "json") {
      printData(summary, context.output);
      return;
    }
    renderMeSummary(summary);
    return;
  }

  throw new CliError(`Unknown me subcommand: ${subcommand}`);
}
