interface Input {
  type: string;
  name: string;
}

export default interface Form {
  title: string;
  inputs: Input[];
}