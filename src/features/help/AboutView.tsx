import './Help.css'

function AboutView() {
  return (
    <section className="help-page">
      <header className="help-header">
        <h2>About Wasteland Workshop</h2>

        <p>
          A crafting economics and build-planning tool for Dystopia Rising.
        </p>
      </header>

      <div className="help-card">
        <h3>Wasteland Workshop</h3>

        <p>
          Wasteland Workshop helps players estimate the cost of crafting
          items, value resources, compare production methods, and plan
          crafting activity.
        </p>

        <p>
          The economic values used by the application are estimates rather
          than official game prices. They are intended to provide a
          consistent starting point for evaluating the time, Mind, resources,
          and other costs involved in producing an item.
        </p>
      </div>

      <div className="help-card">
        <h3>Project Information</h3>

        <dl className="about-details">
          <div>
            <dt>Application</dt>
            <dd>Wasteland Workshop</dd>
          </div>

          <div>
            <dt>Purpose</dt>
            <dd>Crafting economics and build planning</dd>
          </div>

          <div>
            <dt>License</dt>
            <dd>To be determined</dd>
          </div>
        </dl>
      </div>

      <div className="help-card">
        <h3>Unofficial Community Tool</h3>

        <p>
          Wasteland Workshop is an unofficial community-created tool. It is
          not an official Dystopia Rising product and is not affiliated with
          or endorsed by Dystopia Rising.
        </p>

        <p>
          Game rules, blueprint data, item information, and other
          Dystopia Rising material remain the property of their respective
          owners.
        </p>
      </div>
    </section>
  )
}

export default AboutView