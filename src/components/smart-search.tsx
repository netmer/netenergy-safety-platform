'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, BookOpen, Newspaper, FileText } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { getSearchResults } from '@/app/actions';
import type { SmartSearchOutput } from '@/ai/flows/smart-search';
import Link from 'next/link';
import { useSearch } from '@/context/search-context';

export function SmartSearch() {
  const { isOpen, setIsOpen } = useSearch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SmartSearchOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const commandRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery) {
        setResults(null);
        return;
    }

    const fetchResults = async () => {
        setIsLoading(true);
        const searchResults = await getSearchResults(debouncedQuery);
        setResults(searchResults);
        setIsLoading(false);
    };

    fetchResults();
  }, [debouncedQuery]);
  
  const handleSelect = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  // Close search on escape key, or open with cmd/ctrl+k or /
   useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const isTypingInInput = 
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      } else if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) || 
        (e.key === '/' && !isTypingInInput) // Only trigger / search if not focused on an input
      ) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" aria-labelledby="search-title">
      <div className="fixed top-0 left-0 right-0 p-4 animate-in fade-in-50" style={{animationName: 'slide-down-and-fade'}}>
        <div ref={commandRef} className="max-w-xl mx-auto relative">
          
          {/* Stylish "legs" connecting to the top bar */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4/5 max-w-sm h-4 flex justify-center">
            <div className="w-1/4 flex justify-around h-full">
              <div className="border-l border-border/80 h-full"></div>
              <div className="border-l border-border/80 h-full"></div>
            </div>
          </div>

          <Command className="rounded-lg border shadow-lg" shouldFilter={false}>
            <CommandInput 
              value={query} 
              onValueChange={setQuery} 
              placeholder="ค้นหาหลักสูตร, บทความ, หรือหน้าที่ต้องการ..."
              className="h-12 text-base"
            />
            <CommandList>
              {isLoading && (
                  <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
              )}

              {!isLoading && !results && !debouncedQuery && (
                  <CommandEmpty>พิมพ์เพื่อเริ่มค้นหา</CommandEmpty>
              )}

              {!isLoading && !results && debouncedQuery && (
                  <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
              )}
              
              {results?.courses && results.courses.length > 0 && (
                  <CommandGroup heading="หลักสูตรที่แนะนำ">
                  {results.courses.map(course => (
                      <Link key={course.url} href={course.url} passHref>
                          <CommandItem onSelect={handleSelect} value={course.title}>
                              <BookOpen className="mr-3 h-4 w-4" />
                              <div>
                                  <p>{course.title}</p>
                                  <p className="text-xs text-muted-foreground">{course.reason}</p>
                              </div>
                          </CommandItem>
                      </Link>
                  ))}
                  </CommandGroup>
              )}
              {results?.blogs && results.blogs.length > 0 && (
                  <CommandGroup heading="บทความที่เกี่ยวข้อง">
                  {results.blogs.map(blog => (
                      <Link key={blog.url} href={`/blog${blog.url}`} passHref>
                          <CommandItem onSelect={handleSelect} value={blog.title}>
                              <Newspaper className="mr-3 h-4 w-4" />
                              <div>
                                  <p>{blog.title}</p>
                                  <p className="text-xs text-muted-foreground">{blog.reason}</p>
                              </div>
                          </CommandItem>
                      </Link>
                  ))}
                  </CommandGroup>
              )}
              {results?.pages && results.pages.length > 0 && (
                  <CommandGroup heading="หน้าอื่นๆ">
                  {results.pages.map(page => (
                      <Link key={page.url} href={page.url} passHref>
                          <CommandItem onSelect={handleSelect} value={page.title}>
                              <FileText className="mr-3 h-4 w-4" />
                              <div>
                                  <p>{page.title}</p>
                                  <p className="text-xs text-muted-foreground">{page.reason}</p>
                              </div>
                          </CommandItem>
                      </Link>
                  ))}
                  </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      </div>
    </div>
  );
}
