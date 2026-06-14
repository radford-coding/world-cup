import { NavLink } from 'react-router-dom'

const links = [
  { to: '/games', label: 'Games' },
  { to: '/teams', label: 'Teams' },
  { to: '/standings', label: 'Standings' },
]

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">World Cup League</span>
        <div className="navbar-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
