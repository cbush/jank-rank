import { useCallback, useEffect, useState } from "react";
import assert from "assert";

export type MergeSorterProps<T> = {
  array: T[];
  initialState?: MergeSortState<T>;
};

export type Prompt<T> = {
  optionA: T;
  optionB: T;
  selectA(): void;
  selectB(): void;
};

export type MergeSortState<T> = {
  /**
    The sorted list.
   */
  result?: T[];

  /**
    Lists currently under active consideration for merging.
   */
  consideredLists?: [T[], T[]];

  /**
    The rest of the lists in the current pass.
   */
  moreLists: T[][];

  /**
    The lists already merged in the current pass (to be considered in the next
    pass).
   */
  mergedLists: T[][];

  /**
    The list being formed by merging the current considered lists.
   */
  mergedList: T[];

  /**
    The current pair for the user to rank and associated info.
   */
  prompt?: Prompt<T>;
};

// Based on https://github.com/punkave/async-merge-sort/blob/master/index.js
// Modified to be a React hook that reports state for UI display.
export function useMergeSort<T>({
  array,
  initialState,
}: MergeSorterProps<T>): MergeSortState<T> {
  // The lists of the current pass other than those actively being considered
  const [moreLists, setMoreLists] = useState<T[][]>([
    ...(initialState?.moreLists ?? []),
  ]);

  // The lists that will be considered on the next pass
  const [mergedLists, setMergedLists] = useState<T[][]>([
    ...(initialState?.mergedLists ?? []),
  ]);

  const addMergedList = useCallback(
    (list: T[]) => setMergedLists([...mergedLists, list]),
    [mergedLists]
  );

  const [result, setResult] = useState<T[] | undefined>(initialState?.result);

  // Initialize by creating a list for each element in the input array.
  useEffect(() => {
    if (initialState !== undefined) {
      return;
    }
    if (array.length === 0) {
      // Nothing to sort
      setResult([]);
      return;
    }
    setResult(undefined);
    const newMoreLists = array.map((v) => [v]);
    setMoreLists(newMoreLists);
  }, [array, initialState]);

  // Select two lists to consider from the list of lists.
  const [consideredLists, setConsideredLists] = useConsideredLists({
    moreLists,
    addMergedList,
    setMoreLists,
    initialState,
  });

  // Generate a user prompt so we can determine how to merge the two lists under
  // consideration into one.
  const { prompt, mergedList } = useMerger({
    consideredLists,
    setConsideredLists,
    addMergedList,
    initialState,
  });

  // Handle the end of a pass, i.e. when all pairs of lists in the current pass
  // have been considered.
  useEffect(() => {
    if (
      consideredLists === undefined &&
      moreLists.length === 0 &&
      mergedLists.length !== 0
    ) {
      // End of pass.
      if (mergedLists.length === 1 && mergedLists[0].length === array.length) {
        // When all lists have been consolidated into one at the end of a pass, the
        // sort is complete.
        setResult(mergedLists[0]);
        setMoreLists([]);
      } else {
        // Continue to next pass Create a new list of lists out of the list of
        // merged lists.
        setMoreLists(mergedLists);
      }
      setMergedLists([]);
    }
  }, [array, moreLists, mergedLists, consideredLists]);

  return {
    consideredLists,
    moreLists,
    mergedLists,
    mergedList,
    prompt,
    result,
  };
}

export function useConsideredLists<T>({
  moreLists,
  setMoreLists,
  addMergedList,
  initialState,
}: {
  moreLists: T[][];
  addMergedList(list: T[]): void;
  setMoreLists(lists: T[][]): void;
  initialState?: MergeSortState<T>;
}): [
  [T[], T[]] | undefined,
  (consideredLists: [T[], T[]] | undefined) => void
] {
  const [consideredLists, setConsideredLists] = useState<
    [T[], T[]] | undefined
  >(initialState?.consideredLists);

  // Take the next pair of lists to consider
  useEffect(() => {
    if (moreLists.length === 0 || consideredLists !== undefined) {
      return;
    }

    const [consideredListA, consideredListB, ...newMoreLists] = moreLists;

    setMoreLists(newMoreLists);

    if (consideredListB !== undefined) {
      assert(consideredListA !== undefined);
      setConsideredLists([consideredListA, consideredListB]);
    } else {
      // Only one list left in pass. Send it to the next pass.
      assert(consideredListA !== undefined);
      assert(newMoreLists.length === 0);
      addMergedList(consideredListA);
      setConsideredLists(undefined);
    }
  }, [consideredLists, moreLists, addMergedList, setMoreLists]);

  return [consideredLists, setConsideredLists];
}

export function useMerger<T>({
  consideredLists,
  setConsideredLists,
  addMergedList,
  initialState,
}: {
  consideredLists: [T[], T[]] | undefined;
  setConsideredLists(consideredLists: [T[], T[]] | undefined): void;
  addMergedList(list: T[]): void;
  initialState?: MergeSortState<T>;
}): { prompt: Prompt<T> | undefined; mergedList: T[] } {
  const [prompt, setPrompt] = useState<Prompt<T> | undefined>(undefined);

  // The goal is to create one ("merged") list from two ("considered") lists.
  const [mergedList, setMergedList] = useState<T[]>([
    ...(initialState?.mergedList ?? []),
  ]);

  useEffect(() => {
    if (prompt !== undefined) {
      return;
    }
    if (consideredLists === undefined) {
      return;
    }
    // Compare the head of each considered list and move the preferred one to
    // the working merged list. Repeat until one of the considered lists is
    // empty.
    const optionA = consideredLists[0][0];
    const optionB = consideredLists[1][0];
    if (optionA !== undefined && optionB !== undefined) {
      setPrompt({
        optionA,
        optionB,
        selectA() {
          setMergedList([...mergedList, optionA]);
          const newConsideredLists: [T[], T[]] = [
            [...consideredLists[0]],
            [...consideredLists[1]],
          ];
          newConsideredLists[0].shift();
          setConsideredLists(newConsideredLists);
          setPrompt(undefined);
        },
        selectB() {
          setMergedList([...mergedList, optionB]);
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
    const newMergedList = [...mergedList, ...(remainingList ?? [])];
    // Add the working merged list to the next pass's list of lists.
    addMergedList(newMergedList);
    setMergedList([]);

    // Report that we're done with the current set of lists.
    setConsideredLists(undefined);
  }, [prompt, mergedList, consideredLists, setConsideredLists, addMergedList]);

  return { prompt, mergedList };
}
