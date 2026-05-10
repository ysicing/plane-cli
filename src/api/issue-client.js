export class IssueClient {
  constructor(client) {
    this.client = client;
  }

  list(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/`), query);
  }

  get(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/`));
  }

  create(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/`), body);
  }

  update(projectId, issueId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/`), body);
  }

  delete(projectId, issueId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/`));
  }

  getByKey(projectIdentifier, issueIdentifier, query = {}) {
    return this.client.get(this.client.workspacePath(`/work-items/${projectIdentifier}-${issueIdentifier}/`), query);
  }

  search(query = {}) {
    return this.client.get(this.client.workspacePath("/work-items/search/"), query);
  }

  listMyWorkItems(query = {}) {
    return this.client.get(this.client.workspacePath("/me/work-items/"), query);
  }

  listMyProjectWorkItemStats(query = {}) {
    return this.client.get(this.client.workspacePath("/me/projects/work-items/"), query);
  }

  updateEpic(projectId, issueId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/epic/`), body);
  }

  updateMilestone(projectId, issueId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/milestone/`), body);
  }

  listLabels(projectId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/labels/`), query);
  }

  createLabel(projectId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/labels/`), body);
  }

  updateLabel(projectId, labelId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/labels/${labelId}/`), body);
  }

  deleteLabel(projectId, labelId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/labels/${labelId}/`));
  }

  listComments(projectId, issueId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/`), query);
  }

  createComment(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/`), body);
  }

  updateComment(projectId, issueId, commentId, body) {
    return this.client.patch(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/${commentId}/`),
      body
    );
  }

  deleteComment(projectId, issueId, commentId) {
    return this.client.delete(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/comments/${commentId}/`)
    );
  }

  listActivities(projectId, issueId, query = {}) {
    return this.client.get(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/activities/`),
      query
    );
  }

  listLinks(projectId, issueId, query = {}) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/`), query);
  }

  createLink(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/`), body);
  }

  updateLink(projectId, issueId, linkId, body) {
    return this.client.patch(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/${linkId}/`), body);
  }

  deleteLink(projectId, issueId, linkId) {
    return this.client.delete(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/links/${linkId}/`));
  }

  listRelations(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/relations/`));
  }

  createRelation(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/relations/`), body);
  }

  listAttachments(projectId, issueId) {
    return this.client.get(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/`));
  }

  createAttachmentUpload(projectId, issueId, body) {
    return this.client.post(this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/`), body);
  }

  confirmAttachmentUpload(projectId, issueId, attachmentId, body = { is_uploaded: true }) {
    return this.client.patch(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/${attachmentId}/`),
      body
    );
  }

  deleteAttachment(projectId, issueId, attachmentId) {
    return this.client.delete(
      this.client.workspacePath(`/projects/${projectId}/work-items/${issueId}/attachments/${attachmentId}/`)
    );
  }
}
