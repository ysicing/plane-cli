export class UserClient {
  constructor(client) {
    this.client = client;
  }

  me() {
    return this.client.get("/users/me/");
  }
}
