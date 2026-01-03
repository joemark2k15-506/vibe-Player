mermaid
graph TD
A[Play Song Logic] -->|Async Check| B{Metadata Missing?}
B -- No --> C[Display Local Data]
B -- Yes --> D[LibraryManager.fixMetadata]

    subgraph Metadata Resolution System
      D --> E[Search iTunes API]
      E --> F{Match Found?}
      F -- Yes --> G[Score Match (ScoringService)]
      G --> H{Score > 85%?}
      H -- Yes --> I[Fetch Lyrics (Lyrics.ovh)]
      H -- No --> J[Abort / Keep Local]
      I --> K[Update Song Object & Cache]
      K --> L[Save to FileDatabase]
    end

    L --> M[Update UI State]
    M --> N[Display New Artwork/Lyrics]
