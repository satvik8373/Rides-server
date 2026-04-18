import { Pool } from "pg";
import { env } from "../config/env.js";

export class PostgresService {
  private pool?: Pool;

  get enabled(): boolean {
    return Boolean(env.POSTGRES_URL);
  }

  async connect(): Promise<void> {
    if (!this.enabled || this.pool) {
      return;
    }
    this.pool = new Pool({
      connectionString: env.POSTGRES_URL
    });
    await this.pool.query("SELECT 1");
  }

  async checkHealth(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}

export const postgresService = new PostgresService();

