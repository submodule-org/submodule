import React from "react"
import { useApp, useInput, render, Text } from "ink"

export default async function() {
  const Counter = () => {
    const [counter, setCounter] = React.useState(0);
    const { exit } = useApp();
  
    React.useEffect(() => {
      const timer = setInterval(() => {
        setCounter(prevCounter => prevCounter + 1);
      }, 100);
  
      return () => {
        clearInterval(timer);
      };
    });
  
    useInput((input, key) => {
      if (input === "q" || key.escape) {
        exit();
      }
    });
  
    return <Text color="green">{counter} tests passed</Text>;
  }
  
  const enterAltScreenCommand = "\x1b[?1049h";
  const leaveAltScreenCommand = "\x1b[?1049l";
  process.stdout.write(enterAltScreenCommand);
  process.on("exit", () => {
    process.stdout.write(leaveAltScreenCommand);
  });
  
  render(<Counter />)
}