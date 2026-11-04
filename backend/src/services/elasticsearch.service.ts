import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env.js';
import { prisma } from '../config/db.js';

export const ES_EMAIL_INDEX = 'reachinbox_emails';

export class ElasticsearchService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.url,
      // Short request timeout to avoid blocking if ES is not started
      requestTimeout: 2500,
    });
    this.ping();
  }

  private async ping() {
    try {
      await this.client.ping();
      this.isConnected = true;
      console.log('🔍 Connected to Elasticsearch successfully');
      await this.initIndex();
    } catch {
      this.isConnected = false;
      // Normal before ES container is launched
    }
  }

  async initIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: ES_EMAIL_INDEX });
      if (!exists) {
        await this.client.indices.create({
          index: ES_EMAIL_INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                userId: { type: 'keyword' },
                recipientEmail: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } },
                },
                subject: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`📋 Created Elasticsearch index: ${ES_EMAIL_INDEX}`);
      }
    } catch (err) {
      console.warn('Elasticsearch index initialization notice:', err);
    }
  }

  /**
   * Indexes or updates an email record in Elasticsearch.
   */
  async indexEmail(email: {
    id: string;
    userId: string;
    recipientEmail: string;
    subject: string;
    status: string;
    scheduledAt: Date | string;
    sentAt?: Date | string | null;
  }): Promise<void> {
    try {
      await this.client.index({
        index: ES_EMAIL_INDEX,
        id: email.id,
        body: {
          id: email.id,
          userId: email.userId,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          status: email.status,
          scheduledAt: new Date(email.scheduledAt).toISOString(),
          sentAt: email.sentAt ? new Date(email.sentAt).toISOString() : null,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Non-fatal: MySQL remains primary source of truth
      console.warn(`Could not index email ${email.id} to Elasticsearch:`, (err as any).message);
    }
  }

  /**
   * Searches emails by recipient email or subject.
   * If Elasticsearch is offline, gracefully falls back to MySQL full-text / like matching.
   */
  async searchEmails(userId: string, searchTerm: string) {
    if (!searchTerm || !searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.trim();

    try {
      const esResult = await this.client.search({
        index: ES_EMAIL_INDEX,
        body: {
          query: {
            bool: {
              must: [
                { term: { userId } },
                {
                  multi_match: {
                    query: term,
                    fields: ['recipientEmail^2', 'subject'],
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
        },
      });

      const hits = (esResult.hits?.hits || []).map((h) => h._source);
      return hits;
    } catch {
      // Graceful fallback to MySQL database
      return prisma.email.findMany({
        where: {
          userId,
          OR: [
            { recipientEmail: { contains: term } },
            { subject: { contains: term } },
          ],
        },
        orderBy: { scheduledAt: 'desc' },
        take: 50,
      });
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
