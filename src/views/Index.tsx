import {raw_html} from 'edgerender/jsx'
import md from '../README.md'

export default () => <>{raw_html(md)}</>
