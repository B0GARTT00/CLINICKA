export class ReportEntity {
  id: string;
  createdAt: Date;

  constructor(data: { id: string; createdAt: Date }) {
    this.id = data.id;
    this.createdAt = data.createdAt;
  }
}
