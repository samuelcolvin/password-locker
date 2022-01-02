export default function NewLocker() {
  return (
    <div>
      <form action="./submit/" method="POST">
        <div>
          <input name="title" placeholder="locker title" required />
        </div>
        <div>
          <input name="email" placeholder="email" type="email" required />
        </div>
        <div>
          <button type="submit">
            Submit
            <span className="htmx-indicator">...</span>
          </button>
        </div>
      </form>
    </div>
  )
}
