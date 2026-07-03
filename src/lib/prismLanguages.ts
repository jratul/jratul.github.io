import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';

import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import dart from 'react-syntax-highlighter/dist/esm/languages/prism/dart';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import graphql from 'react-syntax-highlighter/dist/esm/languages/prism/graphql';
import groovy from 'react-syntax-highlighter/dist/esm/languages/prism/groovy';
import hcl from 'react-syntax-highlighter/dist/esm/languages/prism/hcl';
import http from 'react-syntax-highlighter/dist/esm/languages/prism/http';
import ini from 'react-syntax-highlighter/dist/esm/languages/prism/ini';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin';
import lua from 'react-syntax-highlighter/dist/esm/languages/prism/lua';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import nginx from 'react-syntax-highlighter/dist/esm/languages/prism/nginx';
import promql from 'react-syntax-highlighter/dist/esm/languages/prism/promql';
import properties from 'react-syntax-highlighter/dist/esm/languages/prism/properties';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';

// 블로그/학습 콘텐츠(public/learn, src/pages/**/*.md)에서 실제로 쓰는 코드 펜스
// 언어만 등록한다. 전체 Prism 번들(react-syntax-highlighter의 기본 Prism export)은
// 100개 이상의 언어를 포함해 gzip 기준 230KB에 달하므로, light 빌드 + 선택 등록으로
// 콘텐츠 페이지(Post/LearnLessonPage)가 매번 받는 청크 크기를 크게 줄인다.
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('dart', dart);
SyntaxHighlighter.registerLanguage('docker', docker);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('graphql', graphql);
SyntaxHighlighter.registerLanguage('groovy', groovy);
SyntaxHighlighter.registerLanguage('hcl', hcl);
SyntaxHighlighter.registerLanguage('http', http);
SyntaxHighlighter.registerLanguage('ini', ini);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('kotlin', kotlin);
SyntaxHighlighter.registerLanguage('lua', lua);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('nginx', nginx);
SyntaxHighlighter.registerLanguage('promql', promql);
SyntaxHighlighter.registerLanguage('properties', properties);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('toml', toml);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);

// 콘텐츠에서 쓰는 코드펜스 표기(ts/js/html/xml/dockerfile/cql)를 실제 등록된
// 언어로 매핑. cql(Cassandra Query Language)은 SQL과 문법이 유사해 sql로 대체한다.
SyntaxHighlighter.alias('typescript', 'ts');
SyntaxHighlighter.alias('javascript', 'js');
SyntaxHighlighter.alias('markup', ['html', 'xml']);
SyntaxHighlighter.alias('docker', 'dockerfile');
SyntaxHighlighter.alias('sql', 'cql');
// refractor에 별도 gradle 문법이 없어 Groovy DSL 기반인 groovy로 대체한다.
SyntaxHighlighter.alias('groovy', 'gradle');

export { SyntaxHighlighter };
