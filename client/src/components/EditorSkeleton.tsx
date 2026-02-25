const EditorSkeleton = () => {
  const lines = [
    { width: "w-32", indent: "ml-0" }, // import statement
    { width: "w-40", indent: "ml-0" }, // import statement
    { width: "w-0", indent: "ml-0" }, // empty line
    { width: "w-56", indent: "ml-0" }, // function declaration
    { width: "w-28", indent: "ml-4" }, // indented line
    { width: "w-64", indent: "ml-4" }, // indented line
    { width: "w-40", indent: "ml-8" }, // more indented
    { width: "w-32", indent: "ml-8" }, // more indented
    { width: "w-12", indent: "ml-4" }, // closing brace
    { width: "w-0", indent: "ml-0" }, // empty line
    { width: "w-52", indent: "ml-0" }, // another function
    { width: "w-36", indent: "ml-4" }, // indented
    { width: "w-28", indent: "ml-4" }, // indented
    { width: "w-48", indent: "ml-4" }, // indented
    { width: "w-10", indent: "ml-0" }, // closing brace
    { width: "w-0", indent: "ml-0" }, // empty line
  ];

  return (
    <div
      className="flex font-mono"
      style={{
        background: "#171717",
        fontSize: "14px",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: -200px 0;
            }
            100% {
              background-position: calc(200px + 100%) 0;
            }
          }
          
          .shimmer {
            background: linear-gradient(
              90deg,
              #404040 0%,
              #525252 50%,
              #404040 100%
            );
            background-size: 200px 100%;
            animation: shimmer 2s infinite;
          }
        `}
      </style>
      {/* Line numbers */}
      <div
        className="flex flex-col text-right select-none"
        style={{
          background: "#171717",
          color: "#6b6b6b",
          padding: "0 12px 0 20px",
          minWidth: "75px",
          fontSize: "14px",
          lineHeight: "21px",
        }}
      >
        {lines.map((_, index) => (
          <div key={index} style={{ height: "21px" }}>
            {index + 1}
          </div>
        ))}
      </div>

      {/* Code content */}
      <div className="flex-1" style={{ padding: "0 0 0 12px" }}>
        {lines.map((line, index) => (
          <div
            key={index}
            className={`flex items-center ${line.indent}`}
            style={{ height: "21px", lineHeight: "21px" }}
          >
            {line.width !== "w-0" ? (
              <div
                className={`${line.width} shimmer rounded`}
                style={{
                  height: "15px",
                  transition: "opacity 0.2s ease-in-out",
                }}
              ></div>
            ) : (
              <div style={{ height: "15px" }}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditorSkeleton;
