import { Observable, Subject, filter, map, mergeMap, shareReplay } from 'rxjs';
import { createEffect, createSignal, onCleanup } from 'solid-js';

function nonNullable<T>(e: T): e is NonNullable<typeof e> {
  return e !== null;
}

export type Handler<E> = (<O>(transform: (e: E) => Promise<O> | O) => Handler<NonNullable<O>>) & {
  $: Observable<E>;
};
type Emitter<E> = (e: E) => void;

function makeHandler<E>($: Observable<E>): Handler<E> {
  function handler<O>(transform: (e: E) => Promise<O> | O): Handler<NonNullable<O>> {
    const next$ = $.pipe(
      mergeMap(p => {
        const result = transform(p);
        return result instanceof Promise ? result : [result];
      }),
      filter(nonNullable),
      shareReplay(1)
    );

    return makeHandler<NonNullable<O>>(next$);
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

export function createSubject<T>(init: T, ...events: Array<Handler<T | ((prev: T) => T)>>) {
  const [signal, setSignal] = createSignal(init);
  const event = createTopic(...events);
  createListener(event as Handler<Exclude<T, Function> | ((prev: T) => T)>, setSignal);
  return signal;
}

export function createEmitter(): Handler<any>;
export function createEmitter<T>(source: () => T): Handler<T>;
export function createEmitter<T>(source?: () => T) {
  const [onEvent, emitEvent] = createEvent<T>();
  createEffect(() => emitEvent(source?.() ?? (true as T)));
  return onEvent;
}
