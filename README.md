# familyTree
Single-page web UI for building and visualising a family tree without a database.

## Getting started

1. Open `index.html` in a browser or serve the project with any static file server.
2. Use the form controls to add family members and set relationships such as parents, children, and multiple spouses.
3. Click **Save to LocalStorage** to persist the current state locally. The saved graph will be reloaded automatically on your next visit.
4. Use **Reset to Sample Data** to restore the provided demo family.

The graph is rendered with the open-source [`vis-network`](https://visjs.github.io/vis-network/docs/network/) library.
