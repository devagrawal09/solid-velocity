import { Observable, Subject, filter, switchMap, tap } from 'rxjs';
import { Accessor, createSignal, onCleanup } from 'solid-js';

function nonNullable<T>(e: T): e is NonNullable<typeof e> {
  return e !== null;
}

export type Handler<E> = (<O>(transform: (e: E) => O | Promise<O>) => Handler<NonNullable<O>>) & {
  $: Observable<E>;
};
type Emitter<E> = (e: E) => void;

function makeHandler<E>($: Observable<E>): Handler<E> {
  function handler<O>(transform: (e: E) => O | Promise<O>): Handler<NonNullable<O>> {
    const nextHandler = makeHandler<NonNullable<O>>(
      handler.$.pipe(
        switchMap(input => {
          const output = transform(input);
          return output instanceof Promise ? output : [output];
        }),
        filter(nonNullable)
      )
    );

    return nextHandler;
  }
  handler.$ = $;
  return handler;
}

export function createEvent<E>(): [Handler<E>, Emitter<E>] {
  const $ = new Subject<E>();
  return [makeHandler($), e => $.next(e)] as const;
}

export function createTopic<T>(...args: Handler<T>[]): Handler<T> {
  const [onEvent, emitEvent] = createEvent<T>();
  args.forEach(h => createListener(h, emitEvent));
  return onEvent;
}

export function createListener<E>(source: Handler<E>, sink: (input: E) => void) {
  const sub = source.$.subscribe(sink);
  onCleanup(() => sub.unsubscribe());
}

export function createSubject<T>(event: Handler<T>): Accessor<T | undefined>;
export function createSubject<T>(event: Handler<T>, init: T): Accessor<T>;
export function createSubject<T>(event: Handler<T>, init?: T) {
  const [signal, setSignal] = createSignal<T>(init!);
  createListener<T>(event, setSignal);
  return signal;
}
