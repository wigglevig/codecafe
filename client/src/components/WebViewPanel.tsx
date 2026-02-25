import { useMemo } from "react";
import "./WebViewPanel.css";
import { FaEarthAmericas } from "react-icons/fa6";
import { WebViewPanelProps } from "../types/props";

const WebViewPanel = ({
  htmlContent = "",
  cssContent = "",
  jsContent = "",
  onClose,
}: WebViewPanelProps) => {
  // Construct srcDoc using useMemo to avoid unnecessary recalculations
  const srcDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Basic reset for preview */
          body { margin: 0; padding: 8px; font-family: sans-serif; }
          ${cssContent}
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          /* Optional: Add error handling for preview script */
          try {
            ${jsContent}
          } catch (error) {
            console.error('Preview Script Error:', error);
            // Optionally display error in the preview itself
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'fixed';
            errorDiv.style.bottom = '0';
            errorDiv.style.left = '0';
            errorDiv.style.right = '0';
            errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '5px';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.zIndex = '9999';
            errorDiv.textContent = 'Preview Script Error: ' + error.message;
            document.body.appendChild(errorDiv);
          }
        </script>
      </body>
      </html>
    `;
  }, [htmlContent, cssContent, jsContent]);

  // Prevent default link behavior and call onClose
  const handleCloseClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClose?.();
  };

  return (
    <div id="web-view-content" className="h-full flex flex-col">
      {/* Browser */}
      <div id="browser" className="clear flex-shrink-0">
        {/* tabs */}
        <ul className="tabs">
          {/* Single placeholder tab */}
          <li className="active">
            <span
              style={{
                position: "absolute",
                left: "-8px",
                top: "8px",
                zIndex: 9,
                transform: "skewX(-25deg)",
                display: "inline-block",
              }}
            >
              <FaEarthAmericas size={12} />
            </span>
            <span
              style={{
                transform: "skewX(-25deg)",
                display: "inline-block",
                marginLeft: "-5px",
              }}
            >
              Preview
            </span>
            {/* Close button remains a direct child for positioning relative to the skewed li */}
            <a className="close" href="#" onClick={handleCloseClick}>
              ×
            </a>
          </li>
          {/* Add button element - No longer wrapped in <li> */}
          <a
            href="#"
            className="add"
            onClick={(e) => e.preventDefault()}
            title="Add Tab (Placeholder)"
          />
        </ul>
        <div className="bar clear">
          <ul>
            <li>
              <a
                className="icon-arrow-left"
                href="#"
                title="Back"
                onClick={(e) => e.preventDefault()}
              >
                <svg viewBox="0 0 16 16">
                  <path d="M16,7H3.8l5.6-5.6L8,0L0,8l8,8l1.4-1.4L3.8,9H16V7z" />
                </svg>
              </a>
            </li>
            <li>
              <a
                className="icon-arrow-right"
                href="#"
                title="Forward"
                onClick={(e) => e.preventDefault()}
              >
                <svg viewBox="0 0 16 16">
                  <path d="M8,0L6.6,1.4L12.2,7H0v2h12.2l-5.6,5.6L8,16l8-8L8,0z" />
                </svg>
              </a>
            </li>
            <li>
              <a
                className="icon-refresh"
                href="#"
                title="Refresh"
                onClick={(e) => e.preventDefault()}
              >
                <svg viewBox="0 0 16 16">
                  <path d="M13.6,2.3C12.2,0.9,10.2,0,8,0C3.6,0,0,3.6,0,8s3.6,8,8,8c3.7,0,6.8-2.5,7.7-6h-2.1c-0.8,2.3-3,4-5.6,4c-3.3,0-6-2.7-6-6 s2.7-6,6-6c1.7,0,3.1,0.7,4.2,1.8L9,7h7V0L13.6,2.3z" />
                </svg>
              </a>
            </li>
          </ul>
          <input placeholder="http://example.com/" readOnly type="text" />
          <a
            className="menu-button"
            href="#"
            title="Menu"
            onClick={(e) => e.preventDefault()}
            style={{
              float: "right",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "26px",
              height: "26px",
              borderRadius: "4px",
              margin: "0 2px",
            }}
          >
            <svg
              viewBox="0 0 16 16"
              style={{
                width: "18px",
                height: "18px",
                display: "block",
                fill: "currentColor",
              }}
            >
              <path d="M1 2h14v2H1z M1 7h14v2H1z M1 12h14v2H1z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Actual content iframe area */}
      <div className="page flex-1 min-h-0">
        <iframe
          title="WebView Preview"
          width="100%"
          height="100%"
          srcDoc={srcDoc}
          frameBorder="0"
          className="bg-white"
          sandbox="allow-scripts"
        ></iframe>
      </div>
    </div>
  );
};

export default WebViewPanel;
