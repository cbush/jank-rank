import "./App.css";
import { useState, useEffect } from "react";
import { asyncMergeSort } from "./asyncMergeSort";
import episodes from "./tng-episodes.json";

type Episode = {
  s: string;
  e: string;
  title: string;
  summary: string;
};

type State = {
  episodes?: Episode[];
  a?: Episode;
  b?: Episode;
  selectA?(): void;
  selectB?(): void;
};

function useSortEpisodes() {
  const [state, setState] = useState<State | undefined>(undefined);

  useEffect(() => {
    let innerReject = (_: Error) => {};
    asyncMergeSort(episodes, (a, b) => {
      return new Promise((resolve, reject) => {
        innerReject = reject;
        setState({
          a,
          b,
          selectA() {
            resolve(-1);
          },
          selectB() {
            resolve(1);
          },
        });
      });
    }).then((sorted) => {
      setState({
        episodes: sorted,
      });
    });
    return () => {
      innerReject(new Error("Tearing down"));
    };
  }, [setState]);

  return state;
}

function App() {
  const { a, b, selectA, selectB, episodes } = useSortEpisodes() ?? {};

  if (!a || !b) {
    return (
      <>
        <span>rank, season, episode, title</span>
        <br />
        {episodes?.map((e, i) => (
          <>
            <span key={e.title}>
              {i + 1}, {e.s}, {e.e}, {e.title.replaceAll(",", "\\,")}
            </span>
            <br />
          </>
        ))}
      </>
    );
  }
  return (
    <div className="App">
      <h1>Which is better?</h1>
      <div className="buttons">
        <button onClick={selectA}>
          <h2>{a.title}</h2>
          <p>
            Season {a.s}, episode {a.e}
          </p>
          <p>{a.summary}</p>
        </button>
        <button onClick={selectB}>
          <h2>{b.title}</h2>
          <p>
            Season {b.s}, episode {b.e}
          </p>

          <p>{b.summary}</p>
        </button>
      </div>
    </div>
  );
}

export default App;
