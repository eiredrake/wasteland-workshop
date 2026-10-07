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
          The default value is <strong>0.4cr per Mind</strong>. This value can
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
        <p>Resolve spent in a recipe is valued at 15cr per point by default. Global Settings may override labor, Resolve, the card value, and base resource values. Resetting an override restores the application default; resources without a configured value remain unknown.</p>

        <p>
          Material costs use each resource’s configured value: your saved Settings override, or Ayden’s imported application default. These values stay independent of acquisition or manufacturing costs.
        </p>

        <p>
          Changing a resource value changes the material estimate of blueprints and shopping lists that consume that resource. It does not silently recalculate other configured resource prices.
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

        <p>There is one Foraging Card, valued at <strong>4cr by default</strong>. Every tier uses the same card value; acquisition methods and their yields remain distinct. Change the value in Economics Settings.</p>
      </div>

      <div className="help-card">
        <h3>Production Cost</h3>

        <div className="algorithm-formula">
          Production Cost = Mind Cost + Time Cost + Resolve Cost + Material Cost
        </div>

        <p>
          Material Cost includes the configured value of all required
          components. Acquisition calculations remain separate from configured material values.
        </p>

        <p>
          Configured material values keep their fractional credits, such as Craftable Stone at 4.4cr. The suggested selling price is rounded up to a whole credit. The existing acquisition-cost estimator also rounds its calculated unit costs up.
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