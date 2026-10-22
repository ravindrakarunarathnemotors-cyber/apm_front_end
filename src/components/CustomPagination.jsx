import React from 'react'

const getPagination = (page, totalPages) => {
  const pagination = []

  if (totalPages <= 7) {
    // Show all pages if 7 or less
    for (let i = 1; i <= totalPages; i++) pagination.push(i)
  } else {
    if (page <= 4) {
      pagination.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (page >= totalPages - 3) {
      pagination.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pagination.push(1, '...', page - 1, page, page + 1, '...', totalPages)
    }
  }

  return pagination
}

// const CustomPagination = ({onPageChange, page, allPages}) => {

//     const num = allPages;
//     const pages = Array.from({ length: num }, (_, i) => i + 1);
//     const totalPages = pages.length;
//     const currentIndex = pages.indexOf(page);
//     const startIndex = Math.max(0, currentIndex - 1); // One page before current
//     const endIndex = Math.min(totalPages - 1, currentIndex + 1); // One page after current
//     const visiblePages = pages.slice(startIndex, endIndex + 1);

//     return (
//         <div>
//             <nav aria-label="Page navigation example">
//                 <ul className="pagination">
//                     <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
//                         <div className="page-link" style={{ cursor: 'pointer' }} onClick={() => currentIndex > 0 && onPageChange(pages[currentIndex - 1])}>
//                             Previous
//                         </div>
//                     </li>
//                     {visiblePages.map((pageNumber) => (
//                         <li key={pageNumber} className={`page-item ${pageNumber === page ? "active" : ""}`}>
//                             <div
//                                 className="page-link"
//                                 style={{ cursor: "pointer" }}
//                                 onClick={() => onPageChange(pageNumber)}
//                             >
//                                 {pageNumber}
//                             </div>
//                         </li>
//                     ))}
//                     <li className={`page-item ${currentIndex === totalPages - 1 ? "disabled" : ""}`}>
//                         <div className="page-link" style={{ cursor: 'pointer' }} onClick={() => currentIndex < totalPages - 1 && onPageChange(pages[currentIndex + 1])}>
//                             Next
//                         </div>
//                     </li>
//                 </ul>
//             </nav>
//         </div>
//     )
// }

const CustomPagination = ({ onPageChange, page, allPages }) => {
  const totalPages = allPages
  const pagination = getPagination(page, totalPages)

  return (
    <nav>
      <ul className="pagination mb-0">
        <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
          <button className="page-link" tabIndex="-1" onClick={() => page > 1 && onPageChange(page - 1)}>
            &lt;
          </button>
        </li>
        {pagination.map((item, idx) =>
          item === '...' ? (
            <li key={`ellipsis-${idx}`} className="page-item disabled">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={item} className={`page-item${item === page ? ' active' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(item)}>
                {item}
              </button>
            </li>
          )
        )}
        <li className={`page-item${page === totalPages ? ' disabled' : ''}`}>
          <button className="page-link" tabIndex="-1" onClick={() => page < totalPages && onPageChange(page + 1)}>
            &gt;
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default CustomPagination