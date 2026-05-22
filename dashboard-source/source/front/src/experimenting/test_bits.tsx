import React from "react";

interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return <h2>Welcome, {name}. 👋</h2>;
};

export default Greeting;