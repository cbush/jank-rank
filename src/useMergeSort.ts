import { useCallback, useEffect, useRef, useState } from "react";
import assert from "assert";

export type MergeSorterProps<T> = {
  array: T[];
};

export type Prompt<T> = {
  optionA: T;
  optionB: T;
  selectA(): void;
  selectB(): void;
  selectionSoFar: T[];
};

export type MergeSortState<T> = {
  // Whether the merge is complete.
  done: boolean;

  // The sorted list.
  result?: T[];

  // Lists currently under active consideration.
  consideredLists?: [T[], T[]];

  // The rest of the lists.
  moreLists: T[][];

  // The current pair under consideration.
  prompt?: Prompt<T>;

  // The lists already merged in the current pass.
  mergedLists: T[][];
};

// Based on https://github.com/punkave/async-merge-sort/blob/master/index.js
// Modified to be a React hook that reports state for UI display.
export function useMergeSort<T>({
  array,
}: MergeSorterProps<T>): MergeSortState<T> {
  // The lists of the current pass other than those actively being considered
  const [moreLists, setMoreLists] = useState<T[][]>([]);

  // The lists that will be considered on the next pass
  const [mergedLists, setMergedLists] = useState<T[][]>([]);

  const addMergedList = useCallback(
    (list: T[]) => setMergedLists([...mergedLists, list]),
    [mergedLists]
  );

  const [result, setResult] = useState<T[] | undefined>(undefined);

  const done = result !== undefined;

  // Initialize when input array given
  useEffect(() => {
    if (array.length === 0) {
      setResult([]);
      return;
    }
    const newMoreLists = array.map((v) => [v]);
    setMoreLists(newMoreLists);
  }, [array]);

  const [consideredLists, setConsideredLists] = useConsideredLists({
    done,
    moreLists,
    addMergedList,
    setMoreLists,
  });

  const prompt = usePrompt({
    done,
    consideredLists,
    setConsideredLists,
    addMergedList,
  });

  // End of pass
  useEffect(() => {
    if (
      !done &&
      moreLists.length === 0 &&
      consideredLists === undefined &&
      mergedLists.length !== 0
    ) {
      console.log("Pass complete");
      setMoreLists(mergedLists);
      setMergedLists([]);
    }
  }, [done, moreLists, consideredLists]);

  // End of sort
  useEffect(() => {
    if (moreLists.length === 1 && moreLists[0].length === array.length) {
      setResult(moreLists[0]);
    }
  }, [moreLists, array]);

  return {
    done,
    moreLists,
    consideredLists,
    result,
    prompt,
    mergedLists,
  };
}

function useConsideredLists<T>({
  done,
  moreLists,
  addMergedList,
  setMoreLists,
}: {
  done: boolean;
  moreLists: T[][];
  addMergedList(list: T[]): void;
  setMoreLists(lists: T[][]): void;
}): [
  [T[], T[]] | undefined,
  (consideredLists: [T[], T[]] | undefined) => void
] {
  const [consideredLists, setConsideredLists] = useState<
    [T[], T[]] | undefined
  >(undefined);

  // Take the next pair of lists to consider
  useEffect(() => {
    if (moreLists.length === 0 || consideredLists !== undefined) {
      return;
    }

    const [consideredListA, consideredListB, ...newMoreLists] = moreLists;

    setMoreLists(newMoreLists);
    setConsideredLists(
      consideredListB === undefined
        ? undefined
        : [consideredListA, consideredListB]
    );

    if (consideredListB === undefined) {
      // Only one list left in pass. Add it to the next pass.
      assert(consideredListA !== undefined);
      assert(newMoreLists.length === 0);
      addMergedList(consideredListA);
    }
  }, [consideredLists, done, moreLists, addMergedList, setMoreLists]);

  return [consideredLists, setConsideredLists];
}

function usePrompt<T>({
  consideredLists,
  setConsideredLists,
  addMergedList,
}: {
  done: boolean;
  consideredLists: [T[], T[]] | undefined;
  setConsideredLists(consideredLists: [T[], T[]] | undefined): void;
  addMergedList(list: T[]): void;
}): Prompt<T> | undefined {
  const [prompt, setPrompt] = useState<Prompt<T> | undefined>(undefined);
  const mergedList = useRef<T[]>([]);

  useEffect(() => {
    if (prompt !== undefined) {
      return;
    }
    if (consideredLists === undefined) {
      return;
    }
    const optionA = consideredLists[0][0];
    const optionB = consideredLists[1][0];
    if (optionA !== undefined && optionB !== undefined) {
      setPrompt({
        optionA,
        optionB,
        selectionSoFar: mergedList.current,
        selectA() {
          mergedList.current.push(optionA);
          const newConsideredLists: [T[], T[]] = [
            [...consideredLists[0]],
            [...consideredLists[1]],
          ];
          newConsideredLists[0].shift();
          setConsideredLists(newConsideredLists);
          setPrompt(undefined);
        },
        selectB() {
          mergedList.current.push(optionB);
          const newConsideredLists: [T[], T[]] = [
            [...consideredLists[0]],
            [...consideredLists[1]],
          ];
          newConsideredLists[1].shift();
          setConsideredLists(newConsideredLists);
          setPrompt(undefined);
        },
      });
      return;
    }

    // Reached the end at least one list. Dump the rest of the other into the
    // merged list.
    const remainingList =
      optionA !== undefined
        ? consideredLists[0]
        : optionB !== undefined
        ? consideredLists[1]
        : undefined;
    const { current } = mergedList;
    current.push(...(remainingList ?? []));
    addMergedList(current);
    mergedList.current = [];
    setConsideredLists(undefined);
  }, [prompt, consideredLists, setConsideredLists, addMergedList]);

  return prompt;
}
