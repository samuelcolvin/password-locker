export default function Index() {
  const readme = 'this is the readme'
  return (
    <div hxTarget="#page" hxPushUrl="true">
      <div>{readme}</div>
      <button hxGet="/clicked/">
        Click Me
        <span className="htmx-indicator">...</span>
      </button>
      <button hxDelete="/account" hxPrompt="Enter your account name to confirm deletion">
        Delete My Account
      </button>
      <p align="center">
        <a href="https://smokeshow.helpmanual.io">{/*<img src={icon} alt="smokeshow" width="200" height="200"/>*/}</a>
      </p>
    </div>
  )
}

export function Clicked() {
  return <div>This was clicked.</div>
}
