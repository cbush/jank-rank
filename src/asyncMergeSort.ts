import asyncMergeSortCb from "async-merge-sort";

export type Comparator<T> = (a: T, b: T) => Promise<1 | -1>;

export function asyncMergeSort<T>(
  array: T[],
  comparator: Comparator<T>
): Promise<T[] /* sorted */> {
  return new Promise((resolve, reject) => {
    asyncMergeSortCb(
      array,
      (a: T, b: T, callback: (error?: unknown, result?: number) => void) => {
        comparator(a, b)
          .then((result) => {
            callback(undefined, result);
          })
          .catch((error) => {
            callback(error);
          });
      },
      (error: unknown, sorted: T[]) => {
        if (error) {
          console.error(error);
          return reject(error);
        }
        return resolve(sorted);
      }
    );
  });
}
