import type { TransactionEvent } from '@reliability-index/core/api/schemas';

type Listener = (event: unknown) => void;

/*
 * Stands in for react-native-sse in tests. Each stream the app opens is kept
 * in `opened`, so a test can see where it connected and send it events.
 */
export class FakeEventSource {
  static opened: FakeEventSource[] = [];

  readonly url: string;
  isClosed = false;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.opened.push(this);
  }

  static latest(): FakeEventSource {
    return FakeEventSource.opened[FakeEventSource.opened.length - 1];
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.isClosed = true;
  }

  // What the server does, for the test to call.
  open() {
    this.dispatch('open', { type: 'open' });
  }

  sendTransactionEvent(id: string, event: TransactionEvent) {
    this.dispatch(event.type, { type: event.type, data: JSON.stringify(event), lastEventId: id });
  }

  dropConnection() {
    this.dispatch('error', { type: 'error', message: '', xhrStatus: 0, xhrState: 4 });
  }

  answerWithError(status: number) {
    this.dispatch('error', { type: 'error', message: '', xhrStatus: status, xhrState: 4 });
  }

  private dispatch(type: string, event: unknown) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

export default FakeEventSource;
