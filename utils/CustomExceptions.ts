class NotionDatabaseNotFound extends Error {
  response: { status: number; data: { message: string } };
  constructor(message: string) {
    super(message);
    this.name = "NotionDatabaseNotFound";

    this.response = {
      status: 404,
      data: {
        message:
          "No database found. Ensure you select a database that was duplicated from the template.",
      },
    };
  }
}

export { NotionDatabaseNotFound };
