export type Repetitions<
    S extends string,
    Len extends number,
    Arr extends unknown[] = [], // counter
    Acc extends string = ""
> = Arr['length'] extends Len
    ? Acc // reached Len
    : Repetitions<
        S,
        Len,
        [...Arr, 1],
        Acc | `${Acc}${S}` // accumulate
    >;