import { EventEmitter } from 'events';
import type { Response } from 'express';

const orderEmitter = new EventEmitter();
const clients: Map<string, Response> = new Map();

export class RealtimeService {
  private static clientIdCounter = 0;

  static addClient(res: Response): string {
    const clientId = `client-${++this.clientIdCounter}`;
    clients.set(clientId, res);

    res.on('close', () => {
      clients.delete(clientId);
    });

    return clientId;
  }

  static emitOrderEvent(event: string, data: any): void {
    const payload = JSON.stringify({ event, data, time: new Date().toISOString() });
    for (const [id, res] of clients.entries()) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch {
        clients.delete(id);
      }
    }
    // Also emit on EventEmitter for internal use
    orderEmitter.emit(event, data);
  }

  static onOrderEvent(event: string, callback: (data: any) => void): void {
    orderEmitter.on(event, callback);
  }

  static getClientCount(): number {
    return clients.size;
  }

  static sendSSEHeaders(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ event: 'connected', time: new Date().toISOString() })}\n\n`);
  }
}
