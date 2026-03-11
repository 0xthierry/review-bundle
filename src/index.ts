import { main, run } from "./main";

export { main, run };

if (import.meta.main) {
  void main();
}
