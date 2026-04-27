import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Tag as AntTag, AutoComplete, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { tagsAPI } from '../api/tags';
import type { TagSuggestion, Tag } from '../types';

const { Text } = Typography;

interface TagInputProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  placeholder?: string;
}

const MATCH_LABELS: Record<string, string> = {
  exact: '精确', prefix: '前缀', similar: '相似', alias: '别名', popular: '热门',
};

const TagInput: React.FC<TagInputProps> = ({ selectedTags, onChange, placeholder = '搜索或创建标签...' }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<any>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    try {
      const res = await tagsAPI.suggest(query);
      setSuggestions(res.data.filter((s) => !selectedTags.some((t) => t.id === s.id)));
    } catch {
      setSuggestions([]);
    }
  }, [selectedTags]);

  useEffect(() => { fetchSuggestions(''); }, [fetchSuggestions]);

  const handleSearch = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 120);
  };

  const addTag = async (suggestion: TagSuggestion) => {
    const res = await tagsAPI.get(suggestion.id);
    onChange([...selectedTags, res.data]);
    setInputValue('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const createAndAddTag = async () => {
    const name = inputValue.trim();
    if (!name || selectedTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setInputValue('');
      return;
    }
    try {
      const res = await tagsAPI.resolve(name);
      if (!selectedTags.some((t) => t.id === res.data.id)) {
        onChange([...selectedTags, res.data]);
      }
    } catch { /* ignore */ }
    setInputValue('');
  };

  const options = [
    ...suggestions.map((s) => ({
      value: `tag-${s.id}`,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: s.color, flexShrink: 0,
            }} />
            <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>{s.name}</Text>
            {s.matched_alias && (
              <Text style={{ color: 'var(--text-quaternary)', fontSize: 11 }}>← {s.matched_alias}</Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'var(--text-quaternary)', fontSize: 11 }}>{MATCH_LABELS[s.match_type]}</Text>
            <Text style={{ color: 'var(--text-quaternary)', fontSize: 11, fontFeatureSettings: '"tnum"' }}>
              ×{s.usage_count}
            </Text>
          </div>
        </div>
      ),
      suggestion: s,
    })),
    ...(inputValue.trim() && !suggestions.some((s) => s.name.toLowerCase() === inputValue.trim().toLowerCase())
      ? [{
          value: `create-${inputValue.trim()}`,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <PlusOutlined style={{ color: 'var(--accent)', fontSize: 12 }} />
              <Text style={{ color: 'var(--accent)', fontSize: 13 }}>创建 "{inputValue.trim()}"</Text>
            </div>
          ),
          suggestion: null,
        }]
      : []),
  ];

  return (
    <div>
      {selectedTags.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selectedTags.map((tag, i) => (
            <AntTag
              key={tag.id}
              closable
              onClose={() => onChange(selectedTags.filter((t) => t.id !== tag.id))}
              className="fade-slide-up"
              style={{
                animationDelay: `${i * 30}ms`,
                margin: 0,
                background: `${tag.color}15`,
                border: `1px solid ${tag.color}33`,
                color: tag.color,
                borderRadius: 'var(--radius-pill)',
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {tag.name}
            </AntTag>
          ))}
        </div>
      )}
      <AutoComplete
        ref={inputRef}
        value={inputValue}
        options={options}
        onSearch={handleSearch}
        onSelect={(value, option) => {
          if (String(value).startsWith('create-')) {
            createAndAddTag();
          } else if (option.suggestion) {
            addTag(option.suggestion);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        open={open && options.length > 0}
        style={{ width: '100%' }}
        popupClassName="tag-input-dropdown"
      >
        <Input
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (suggestions.length > 0 && open) return;
              createAndAddTag();
            }
          }}
          prefix={<SearchOutlined style={{ color: 'var(--text-quaternary)' }} />}
          style={{ height: 36 }}
        />
      </AutoComplete>
    </div>
  );
};

export default TagInput;
