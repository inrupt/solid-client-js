import * as React from "react";

const NoWrap = (props) => {
  return <span style={{ whiteSpace: "nowrap" }}>{props.children}</span>;
};

export default NoWrap;
