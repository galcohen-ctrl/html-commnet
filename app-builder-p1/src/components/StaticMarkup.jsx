import { memo } from 'react';

function StaticMarkup({ as: Tag = 'div', html, ...props }) {
  return <Tag {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default memo(StaticMarkup);
