import { useState } from "react"

export function WithState<StateValue = undefined>({
  children,
  initialState,
}: {
  initialState?: StateValue | (() => StateValue)
  children: (
    state: StateValue | undefined,
    setState: React.Dispatch<React.SetStateAction<StateValue | undefined>>,
  ) => React.ReactNode
}) {
  const [state, setState] = useState<StateValue | undefined>(initialState)
  return children(state, setState)
}
