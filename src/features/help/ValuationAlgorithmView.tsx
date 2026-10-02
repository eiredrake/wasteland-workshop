import './Help.css'

function ValuationAlgorithmView() {
  return (
    <section className="help-page">
      <header className="help-header">
        <h2>Valuation Algorithm</h2>

        <p>
          How Wasteland Workshop estimates production costs and suggested
          selling prices.
        </p>
      </header>

      <div className="help-card">
        <h3>Purpose</h3>

        <p>
          Dystopia Rising does not provide a fixed market price for every
          resource and crafted item. Wasteland Workshop therefore estimates a
          minimum economic value based on the resources consumed to produce an
          item.
        </p>

        <p>
          These values are intended as a consistent baseline, not a rule for
          what an item must sell for. Actual prices can vary based on scarcity,
          demand, availability, negotiation, and local market conditions.
        </p>
      </div>

      <div className="help-card">
        <h3>Mind Cost</h3>

        <p>
          Mind spent during production has an economic value because it is a
          limited resource available to the crafter.
        </p>

        <div className="algorithm-formula">
          Mind Cost = Mind Spent × Mind Value
        </div>

        <p>
          The default value is <strong>0.8cr per Mind</strong>. This value can
          be changed in Economics Settings.
        </p>
      </div>

      <div className="help-card">
        <h3>Time Cost</h3>

        <p>
          Crafting time is also treated as a production cost.
        </p>

        <div className="algorithm-formula">
          Time Cost = Crafting Minutes × Time Value
        </div>

        <p>
          The default value is <strong>0.1cr per minute</strong>. This value
          can also be changed in Economics Settings.
        </p>
      </div>

      <div className="help-card">
        <h3>Resource Cost</h3>

        <p>
          Resources are valued according to the cost of acquiring or producing
          them. When one resource is crafted from other resources, Wasteland
          Workshop recursively calculates the value of those components.
        </p>

        <p>
          This means changes to the value of a basic resource can propagate
          through every item that ultimately depends on that resource.
        </p>
      </div>

      <div className="help-card">
        <h3>Foraging Cards</h3>

        <p>
          Foraged resources have an additional opportunity cost. A foraging
          card must first be found before it can be exchanged for resources, so
          the card itself is treated as having value even when no crafting time
          is required.
        </p>

        <dl className="algorithm-values">
          <div>
            <dt>Basic Foraging</dt>
            <dd>2cr</dd>
          </div>

          <div>
            <dt>Proficient Foraging</dt>
            <dd>5cr</dd>
          </div>

          <div>
            <dt>Master Foraging</dt>
            <dd>9cr</dd>
          </div>
        </dl>

        <p>
          These are default assumptions and can be changed in Economics
          Settings.
        </p>
      </div>

      <div className="help-card">
        <h3>Production Cost</h3>

        <div className="algorithm-formula">
          Production Cost = Mind Cost + Time Cost + Material Cost
        </div>

        <p>
          Material Cost includes the calculated value of all required
          components. Those components may themselves contain labor, resources,
          and foraging costs.
        </p>

        <p>
          When a fractional credit is produced by the calculation, the final
          value is rounded up to the next whole credit. Dystopia Rising does
          not use fractional credits, and a cost greater than zero therefore
          has a minimum practical value of one credit.
        </p>
      </div>

      <div className="help-card">
        <h3>Selling Price</h3>

        <p>
          Production cost represents the estimated cost of making the item.
          Profit is added separately using a markup percentage.
        </p>

        <div className="algorithm-formula">
          Selling Price = Production Cost × (1 + Markup %)
        </div>

        <p>
          The result is rounded up to a whole credit. The default markup is
          <strong> 25%</strong>, but both the default and the markup used for
          an individual calculation can be changed.
        </p>
      </div>

      <div className="help-card">
        <h3>Important Limitations</h3>

        <p>
          The algorithm estimates production value. It does not attempt to
          determine the actual market price of an item.
        </p>

        <p>
          Scarcity, blueprint availability, character skills, local demand,
          event conditions, personal relationships, and other factors can make
          an item's real trading value substantially different from its
          calculated production cost.
        </p>
      </div>
    </section>
  )
}

export default ValuationAlgorithmView