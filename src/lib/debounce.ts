export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
) {
  let timeoutId: number | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      fn(...args);
    }, wait);
  };
}

