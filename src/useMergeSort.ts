import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import assert from "assert";

export type SelectionHandler<T> = (
  selection: 0 | 1,
  state: MergeSortState<T>
) => void;

export type MergeSortProps<T> = {
  array: T[];
  initialState?: MergeSortState<T>;
  onSelectionMade?: SelectionHandler<T>;
};

export type MergeSortPassProps<T> = {
  array: T[];
  state: Omit<MergeSortState<T>, "prompt">;
  onSelectionMade?: SelectionHandler<T>;
  updateState(state: Partial<MergeSortState<T>>): void;
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

export type MergeSortResult<T> = {
  /**
    Current state of the sort.
   */
  state: MergeSortState<T>;

  /**
    The current pair for the user to rank and associated info.
   */
  prompt?: Prompt<T>;

  /**
    Override the state.
   */
  setState(state: MergeSortState<T>): void;
};

export type UndoableMergeSortResult<T> = MergeSortResult<T> & {
  /**
    Action to revert to a previous state or undefined if there is no prior state
    to return to.
   */
  undo?(): void;
};

export function useUndoableMergeSort<T>({
  array,
  initialState,
  onSelectionMade,
}: MergeSortProps<T>): UndoableMergeSortResult<T> {
  const states = useRef<MergeSortState<T>[]>([]);
  const { state, prompt, setState } = useMergeSort({
    array,
    initialState,
    onSelectionMade(selection, state) {
      // Store state snapshot
      states.current.push(state);
      onSelectionMade && onSelectionMade(selection, state);
    },
  });

  const undo = useCallback(() => {
    const previousState = states.current.pop();
    if (previousState) {
      setState({ ...previousState, prompt: undefined });
    }
  }, [setState]);

  return {
    state,
    setState,
    prompt,
    undo: states.current.length > 0 ? undo : undefined,
  };
}

// Based on https://github.com/punkave/async-merge-sort/blob/master/index.js
// Modified to be a React hook that reports state for UI display.
export function useMergeSort<T>({
  array,
  initialState,
  onSelectionMade,
}: MergeSortProps<T>): MergeSortResult<T> {
  const [state, updateState] = useReducer(
    (oldState: MergeSortState<T>, newState: Partial<MergeSortState<T>>) => {
      return {
        ...oldState,
        ...newState,
      };
    },
    initialState ?? {
      result: undefined,
      consideredLists: undefined,
      moreLists: [],
      mergedLists: [],
      mergedList: [],
    }
  );

  const setState = useCallback(
    (state: MergeSortState<T>) => updateState(state),
    []
  );

  // Initialize by creating a list for each element in the input array.
  useEffect(() => {
    if (initialState !== undefined) {
      // Only initialize if not given an initial state
      return;
    }
    if (array.length === 0) {
      // Nothing to sort
      updateState({ result: [] });
      return;
    }
    const newMoreLists = array.map((v) => [v]);
    updateState({ result: undefined, moreLists: newMoreLists });
  }, [array, initialState]);

  useMergeSortPass({
    array,
    state,
    updateState,
    onSelectionMade,
  });

  return {
    state,
    prompt: state.prompt,
    setState,
  };
}

export function useMergeSortPass<T>({
  array,
  state,
  updateState,
  onSelectionMade,
}: MergeSortPassProps<T>): void {
  // The lists of the current pass other than those actively being considered
  const { moreLists, mergedLists, mergedList, consideredLists } = state;

  const addMergedList = useCallback(
    (list: T[]) => updateState({ mergedLists: [...mergedLists, list] }),
    [mergedLists, updateState]
  );

  const setMoreLists = useCallback(
    (moreLists: T[][]) => updateState({ moreLists }),
    [updateState]
  );

  const setMergedLists = useCallback(
    (mergedLists: T[][]) => updateState({ mergedLists }),
    [updateState]
  );

  const setMergedList = useCallback(
    (mergedList: T[]) => updateState({ mergedList }),
    [updateState]
  );

  const setResult = useCallback(
    (result: T[] | undefined) => updateState({ result }),
    [updateState]
  );

  const setPrompt = useCallback(
    (prompt: Prompt<T> | undefined) => updateState({ prompt }),
    [updateState]
  );

  const setConsideredLists = useCallback(
    (consideredLists: [T[], T[]] | undefined) =>
      updateState({ consideredLists }),
    [updateState]
  );

  // Select two lists to consider from the list of lists.
  useConsideredLists({
    state,
    addMergedList,
    setConsideredLists,
    setMoreLists,
  });

  // Generate a user prompt so we can determine how to merge the two lists under
  // consideration into one.
  useMerger({
    mergedList,
    setConsideredLists,
    setMergedList,
    addMergedList,
    onSelectionMade,
    state,
    setPrompt,
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
  }, [
    array,
    moreLists,
    mergedLists,
    consideredLists,
    setMergedLists,
    setMoreLists,
    setResult,
  ]);
}

export function useConsideredLists<T>({
  state,
  setMoreLists,
  addMergedList,
  setConsideredLists,
}: {
  state: MergeSortState<T>;
  addMergedList(list: T[]): void;
  setMoreLists(lists: T[][]): void;
  setConsideredLists(consideredLists: [T[], T[]] | undefined): void;
}): void {
  const { moreLists, consideredLists } = state;
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
  }, [
    consideredLists,
    moreLists,
    addMergedList,
    setMoreLists,
    setConsideredLists,
  ]);
}

export function useMerger<T>({
  mergedList,
  setMergedList,
  setConsideredLists,
  addMergedList,
  onSelectionMade,
  state,
  setPrompt,
}: {
  setConsideredLists(consideredLists: [T[], T[]] | undefined): void;
  addMergedList(list: T[]): void;
  setMergedList(list: T[]): void;
  mergedList: T[];
  onSelectionMade?: SelectionHandler<T>;
  state: MergeSortState<T>;
  setPrompt(prompt: Prompt<T> | undefined): void;
}) {
  const { consideredLists, prompt } = state;

  // The goal is to create one ("merged") list from two ("considered") lists.
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
          onSelectionMade && onSelectionMade(0, state);
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
          onSelectionMade && onSelectionMade(1, state);
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
  }, [
    prompt,
    setMergedList,
    mergedList,
    consideredLists,
    setConsideredLists,
    addMergedList,
    onSelectionMade,
    state,
    setPrompt,
  ]);
}
