import { render, screen, fireEvent } from "@testing-library/react";
import { useMergeSort, MergeSortState } from "./useMergeSort";

const UseMergeSortTest = function <T extends { toString(): string }>({
  array,
  initialState,
}: {
  array: T[];
  initialState?: Omit<MergeSortState<T>, "prompt">;
}) {
  const { prompt, state } = useMergeSort({ array, initialState });
  const { result } = state;
  if (result) {
    return <p>Result: {result.join(", ")}</p>;
  }
  if (!prompt) {
    return <></>;
  }
  return (
    <>
      <label htmlFor="selectA">Select A</label>
      <button id="selectA" onClick={prompt?.selectA}>
        {prompt?.optionA.toString()}
      </button>
      <label htmlFor="selectB">Select B</label>
      <button id="selectB" onClick={prompt?.selectB}>
        {prompt?.optionB.toString()}
      </button>
    </>
  );
};

it("sorts according to user input", async () => {
  render(<UseMergeSortTest array={[3, 1, 2]} />);
  expect(screen.getByLabelText("Select A").textContent).toBe("3");
  expect(screen.getByLabelText("Select B").textContent).toBe("1");
  fireEvent.click(screen.getByLabelText("Select B"));
  expect(screen.getByLabelText("Select B").textContent).toBe("2");
  fireEvent.click(screen.getByLabelText("Select A"));
  expect(screen.getByLabelText("Select A").textContent).toBe("3");
  expect(screen.getByLabelText("Select B").textContent).toBe("2");
  fireEvent.click(screen.getByLabelText("Select B"));
  const result = screen.getByText(/^Result: /);
  expect(result).toBeInTheDocument();
  expect(result.textContent).toBe("Result: 1, 2, 3");
});

it("can reverse a bigger list", async () => {
  const count = 100;
  const list = Array(count)
    .fill(0)
    .map((_, i) => i);
  render(<UseMergeSortTest array={list} />);

  let iterations = 0;
  while (screen.queryByText(/^Result: /) === null) {
    expect(iterations).toBeLessThanOrEqual(count * Math.log2(count));
    const selectA = screen.getByLabelText("Select A");
    const selectB = screen.getByLabelText("Select B");
    const a = parseInt(selectA.textContent ?? "");
    const b = parseInt(selectB.textContent ?? "");
    fireEvent.click(screen.getByLabelText(a > b ? "Select A" : "Select B"));
    ++iterations;
  }
  const result = screen.getByText(/^Result: /);
  expect(result).toBeInTheDocument();
  expect(result.textContent).toBe(`Result: ${[...list].reverse().join(", ")}`);
});

it("can start from a midpoint state", async () => {
  render(
    <UseMergeSortTest
      array={[3, 1, 2]}
      initialState={{
        moreLists: [[2]],
        mergedList: [],
        mergedLists: [[1, 3]],
        consideredLists: undefined,
      }}
    />
  );
  /*
  expect(screen.getByLabelText("Select A").textContent).toBe("3");
  expect(screen.getByLabelText("Select B").textContent).toBe("1");
  fireEvent.click(screen.getByLabelText("Select B"));
  */
  expect(screen.getByLabelText("Select B").textContent).toBe("2");
  fireEvent.click(screen.getByLabelText("Select A"));
  expect(screen.getByLabelText("Select A").textContent).toBe("3");
  expect(screen.getByLabelText("Select B").textContent).toBe("2");
  fireEvent.click(screen.getByLabelText("Select B"));
  const result = screen.getByText(/^Result: /);
  expect(result).toBeInTheDocument();
  expect(result.textContent).toBe("Result: 1, 2, 3");
});
