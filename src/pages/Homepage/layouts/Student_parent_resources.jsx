import "../css/resources.css";
const Student_parent_resources = () => {
  return (
    <div>
      <div className='parent_resources_container'>
        <h1>Student & Parent Resources</h1>
        <div className='resources-container'>
          <div className='quick-links'>
            <h3>Quick Links</h3>
            <ul>
              <li>
                <a href='#'>Student Login</a>
              </li>
              <li>
                <a href='#'>Parent Login</a>
              </li>
              <li>
                <a href='#'>Library</a>
              </li>
              <li>
                <a href='#'>Other Resources</a>
              </li>
            </ul>
          </div>

          <div className='downloads'>
            <h3>Downloads</h3>
            <ul>
              <li>
                <a href='#'>Forms</a>
              </li>
              <li>
                <a href='#'>Handbooks</a>
              </li>
              <li>
                <a href='#'>Important Documents</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Student_parent_resources;
