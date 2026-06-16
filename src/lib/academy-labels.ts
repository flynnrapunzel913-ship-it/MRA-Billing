/** Academy-facing UI labels (database models still use "customer"). */

export function studentNoun(count: number): string {
  return count === 1 ? "Student" : "Students";
}
