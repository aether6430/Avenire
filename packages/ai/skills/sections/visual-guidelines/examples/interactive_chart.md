## Interactive chart example

Use a literal fragment with one root ID, native controls, and one dominant visual:

```html
<div id="chart-root">
  <div class="viz-controls">
    <label class="form-label" for="period">Period</label>
    <select class="form-select" id="period">
      <option>30 days</option>
      <option>90 days</option>
    </select>
  </div>
  <div role="img" aria-label="Trend over time" id="chart"></div>
</div>
<script>
  const root = document.getElementById("chart-root");
  const period = root.querySelector("#period");
  period.addEventListener("change", () => render(period.value));
  render(period.value);
</script>
```

Keep selection local, update the visual rather than adding a second panel, and keep the first render useful before any input changes.
