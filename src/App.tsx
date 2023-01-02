import "./App.css";
import { useCallback, useEffect, useState } from "react";
import { useMergeSort, MergeSortState } from "./useMergeSort";
import episodes from "./tng-episodes.json";

type Episode = {
  s: string;
  e: string;
  title: string;
  summary: string;
};

const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  .map((value) => ({ value, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value);

const subset = episodes.slice(0, 10);

function App() {
  const { state, prompt } = useMergeSort({
    array: subset,
  });
  const {
    result,
    moreLists,
    consideredLists,
    mergedLists,
    mergedList: selectionSoFar,
  } = state;

  const { optionA, optionB, selectA, selectB } = prompt ?? {};
  if (result !== undefined) {
    return (
      <>
        <h1>Result</h1>
        <ol>
          {result?.map((v, i) => (
            <li key={i}>{v.title}</li>
          ))}
        </ol>
      </>
    );
  }
  return (
    <div className="App">
      <h1>Which is better?</h1>
      <div className="buttons">
        <button onClick={selectA}>
          <h2>{optionA?.title}</h2>
        </button>
        <button onClick={selectB}>
          <h2>{optionB?.title}</h2>
        </button>
      </div>
      <p>Considered lists</p>
      <ul>
        {consideredLists?.map((v, i) => (
          <li key={i}>{v.map((v) => v.title).join(", ")}</li>
        ))}
      </ul>

      <p>More lists</p>
      <ul>
        {moreLists.map((v, i) => (
          <li key={i}>{v.map((v) => v.title).join(", ")}</li>
        ))}
      </ul>

      <p>Merged lists</p>
      <ul>
        {(selectionSoFar ? [...mergedLists, selectionSoFar] : mergedLists).map(
          (v, i) => (
            <li key={i}>{v.map((v) => v.title).join(", ")}</li>
          )
        )}
      </ul>
    </div>
  );
}

export default App;
